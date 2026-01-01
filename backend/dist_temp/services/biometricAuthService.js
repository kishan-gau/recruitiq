/**
 * Biometric Authentication Service
 * Handles WebAuthn/FIDO2 credential registration and authentication
 * Supports Touch ID, Face ID, and other platform authenticators
 */
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse, } from '@simplewebauthn/server';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import * as Joi from 'joi';
class BiometricAuthService {
    constructor() {
        // WebAuthn configuration
        this.rpName = 'RecruitIQ';
        this.logger = logger;
        // Get RP ID and origin from environment or use defaults
        this.rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
        this.origin = process.env.WEBAUTHN_ORIGIN || `http://localhost:${process.env.PORT || 3001}`;
        // In production, these should be set properly
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.WEBAUTHN_RP_ID || !process.env.WEBAUTHN_ORIGIN) {
                this.logger.warn('WebAuthn RP_ID and ORIGIN not set in production environment');
            }
        }
    }
    /**
     * Generate registration options for a new biometric credential
     * Step 1 of WebAuthn registration flow
     */
    async generateRegistrationOptions(employeeId, organizationId, deviceName) {
        try {
            // Validate input
            const validated = await BiometricAuthService.registerOptionsSchema.validateAsync({
                employeeId,
                deviceName,
            });
            // Get employee info for user data
            const employeeQuery = `
        SELECT id, first_name, last_name, email, employee_number
        FROM hris.employee
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
            const employeeResult = await query(employeeQuery, [validated.employeeId, organizationId], organizationId);
            if (employeeResult.rows.length === 0) {
                throw new Error('Employee not found');
            }
            const employee = employeeResult.rows[0];
            // Get existing credentials for this employee
            const existingCredentials = await this.getEmployeeCredentials(validated.employeeId, organizationId);
            // Generate registration options
            const options = await generateRegistrationOptions({
                rpName: this.rpName,
                rpID: this.rpID,
                userID: employee.id,
                userName: employee.email,
                userDisplayName: `${employee.first_name} ${employee.last_name}`,
                // Exclude already registered credentials
                excludeCredentials: existingCredentials.map(cred => ({
                    id: cred.credential_id, // Already base64url string
                    transports: cred.transports,
                })),
                // Authenticator selection criteria
                authenticatorSelection: {
                    // Platform authenticators (Touch ID, Face ID, Windows Hello)
                    authenticatorAttachment: 'platform',
                    // Require user verification
                    userVerification: 'required',
                    // Prefer discoverable credentials (passkeys)
                    residentKey: 'preferred',
                },
                // Attestation
                attestationType: 'none', // 'direct' for production with device verification
                // Timeout (60 seconds)
                timeout: 60000,
            });
            // SECURITY NOTE: Challenge should be stored server-side with TTL in production
            // Current implementation returns challenge to client for simplicity
            // Production recommendation:
            // - Store challenge in Redis with 60-second TTL
            // - Associate challenge with user session
            // - Validate challenge on verification endpoint
            // This prevents challenge manipulation and replay attacks
            this.logger.info('Generated biometric registration options', {
                employeeId: validated.employeeId,
                organizationId,
                challengeLength: options.challenge.length,
            });
            return {
                options,
                employee: {
                    id: employee.id,
                    name: `${employee.first_name} ${employee.last_name}`,
                    email: employee.email,
                },
            };
        }
        catch (error) {
            this.logger.error('Error generating registration options:', error);
            throw error;
        }
    }
    /**
     * Verify registration response and store credential
     * Step 2 of WebAuthn registration flow
     */
    async verifyRegistration(employeeId, organizationId, response, expectedChallenge, deviceInfo, userId) {
        try {
            // Validate input
            const validated = await BiometricAuthService.registerVerifySchema.validateAsync({
                employeeId,
                response,
                deviceInfo,
            });
            // Verify the registration response
            let verification;
            try {
                verification = await verifyRegistrationResponse({
                    response: validated.response,
                    expectedChallenge,
                    expectedOrigin: this.origin,
                    expectedRPID: this.rpID,
                    requireUserVerification: true,
                });
            }
            catch (error) {
                this.logger.error('WebAuthn verification failed:', error);
                throw new Error(`Biometric registration verification failed: ${error.message}`);
            }
            if (!verification.verified || !verification.registrationInfo) {
                throw new Error('Biometric credential verification failed');
            }
            const { registrationInfo } = verification;
            // Store the credential in database
            const insertQuery = `
        INSERT INTO hris.biometric_credential (
          organization_id,
          employee_id,
          credential_id,
          public_key,
          counter,
          credential_type,
          transports,
          device_name,
          device_type,
          browser,
          platform,
          aaguid,
          attestation_object,
          attestation_format,
          is_backed_up,
          is_discoverable,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;
            const params = [
                organizationId,
                validated.employeeId,
                registrationInfo.credential.id, // Already base64url string
                Buffer.from(registrationInfo.credential.publicKey).toString('base64'),
                registrationInfo.credential.counter,
                registrationInfo.credentialType,
                JSON.stringify(registrationInfo.credential.transports || []),
                deviceInfo?.deviceName || `${deviceInfo?.platform || 'Device'} - ${new Date().toLocaleDateString()}`,
                deviceInfo?.deviceType || null,
                deviceInfo?.browser || null,
                deviceInfo?.platform || null,
                registrationInfo.aaguid || null,
                registrationInfo.attestationObject ? Buffer.from(registrationInfo.attestationObject).toString('base64') : null,
                registrationInfo.fmt || null,
                registrationInfo.credentialBackedUp || false,
                registrationInfo.credentialDeviceType === 'multiDevice' || false,
                userId,
            ];
            const result = await query(insertQuery, params, organizationId, {
                operation: 'INSERT',
                table: 'hris.biometric_credential',
            });
            this.logger.info('Biometric credential registered successfully', {
                employeeId: validated.employeeId,
                organizationId,
                credentialId: result.rows[0].credential_id,
                deviceType: deviceInfo?.deviceType,
                platform: deviceInfo?.platform,
            });
            return {
                success: true,
                credential: result.rows[0],
            };
        }
        catch (error) {
            this.logger.error('Error verifying registration:', error);
            throw error;
        }
    }
    /**
     * Generate authentication options for biometric login
     * Step 1 of WebAuthn authentication flow
     */
    async generateAuthenticationOptions(employeeId, organizationId) {
        try {
            // Get employee's registered credentials
            const credentials = await this.getEmployeeCredentials(employeeId, organizationId);
            if (credentials.length === 0) {
                throw new Error('No biometric credentials registered for this employee');
            }
            // Generate authentication options
            const options = await generateAuthenticationOptions({
                rpID: this.rpID,
                // Allow any registered credential
                allowCredentials: credentials.map(cred => ({
                    id: cred.credential_id, // Already base64url string
                    transports: cred.transports,
                })),
                // User verification required
                userVerification: 'required',
                // Timeout (60 seconds)
                timeout: 60000,
            });
            this.logger.info('Generated biometric authentication options', {
                employeeId,
                organizationId,
                credentialCount: credentials.length,
            });
            return {
                options,
                credentialCount: credentials.length,
            };
        }
        catch (error) {
            this.logger.error('Error generating authentication options:', error);
            throw error;
        }
    }
    /**
     * Verify authentication response
     * Step 2 of WebAuthn authentication flow
     */
    async verifyAuthentication(employeeId, organizationId, response, expectedChallenge) {
        try {
            // Validate input
            const validated = await BiometricAuthService.authenticateVerifySchema.validateAsync({
                employeeId,
                response,
            });
            // Get the credential being used
            const credentialId = response.id;
            const credQuery = `
        SELECT *
        FROM hris.biometric_credential
        WHERE credential_id = $1 
          AND organization_id = $2
          AND employee_id = $3
          AND is_active = true
          AND deleted_at IS NULL
      `;
            const credResult = await query(credQuery, [credentialId, organizationId, validated.employeeId], organizationId);
            if (credResult.rows.length === 0) {
                throw new Error('Biometric credential not found or inactive');
            }
            const credential = credResult.rows[0];
            // Verify the authentication response
            let verification;
            try {
                verification = await verifyAuthenticationResponse({
                    response: validated.response,
                    expectedChallenge,
                    expectedOrigin: this.origin,
                    expectedRPID: this.rpID,
                    credential: {
                        id: credential.credential_id, // Already base64url string
                        publicKey: Buffer.from(credential.public_key, 'base64'),
                        counter: credential.counter,
                        transports: credential.transports,
                    },
                    requireUserVerification: true,
                });
            }
            catch (error) {
                this.logger.error('WebAuthn authentication verification failed:', error);
                throw new Error(`Biometric authentication verification failed: ${error.message}`);
            }
            if (!verification.verified || !verification.authenticationInfo) {
                throw new Error('Biometric authentication failed');
            }
            // Update credential counter and usage stats
            const updateQuery = `
        UPDATE hris.biometric_credential
        SET 
          counter = $1,
          last_used_at = NOW(),
          use_count = use_count + 1,
          updated_at = NOW()
        WHERE id = $2 AND organization_id = $3
      `;
            await query(updateQuery, [verification.authenticationInfo.newCounter, credential.id, organizationId], organizationId, {
                operation: 'UPDATE',
                table: 'hris.biometric_credential',
            });
            this.logger.info('Biometric authentication successful', {
                employeeId: validated.employeeId,
                organizationId,
                credentialId: credential.credential_id,
                counter: verification.authenticationInfo.newCounter,
            });
            return {
                success: true,
                employeeId: validated.employeeId,
                credentialId: credential.credential_id,
            };
        }
        catch (error) {
            this.logger.error('Error verifying authentication:', error);
            throw error;
        }
    }
    /**
     * Get all active credentials for an employee
     */
    async getEmployeeCredentials(employeeId, organizationId) {
        const credQuery = `
      SELECT *
      FROM hris.biometric_credential
      WHERE employee_id = $1 
        AND organization_id = $2
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
        const result = await query(credQuery, [employeeId, organizationId], organizationId);
        return result.rows;
    }
    /**
     * Revoke a biometric credential
     */
    async revokeCredential(credentialId, organizationId, userId) {
        const updateQuery = `
      UPDATE hris.biometric_credential
      SET 
        is_active = false,
        deleted_at = NOW(),
        deleted_by = $1,
        updated_at = NOW()
      WHERE credential_id = $2 AND organization_id = $3
      RETURNING *
    `;
        const result = await query(updateQuery, [userId, credentialId, organizationId], organizationId, {
            operation: 'UPDATE',
            table: 'hris.biometric_credential',
        });
        if (result.rows.length === 0) {
            throw new Error('Credential not found');
        }
        this.logger.info('Biometric credential revoked', {
            credentialId,
            organizationId,
            revokedBy: userId,
        });
        return result.rows[0];
    }
}
/**
 * Validation schemas
 */
BiometricAuthService.registerOptionsSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    deviceName: Joi.string().max(255).optional(),
});
BiometricAuthService.registerVerifySchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    response: Joi.object().required(),
    deviceInfo: Joi.object({
        deviceType: Joi.string().valid('mobile', 'desktop', 'tablet').optional(),
        browser: Joi.string().max(100).optional(),
        platform: Joi.string().max(100).optional(),
    }).optional(),
});
BiometricAuthService.authenticateVerifySchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    response: Joi.object().required(),
});
export default BiometricAuthService;
