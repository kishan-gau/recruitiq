/**
 * Biometric Authentication Controller
 * Handles WebAuthn registration and authentication for mobile PWA
 */

import BiometricAuthService from '../services/biometricAuthService.js';
import logger from '../utils/logger.js';

class BiometricAuthController {
  private service: BiometricAuthService;
  private logger: typeof logger;
  
  constructor() {
    this.service = new BiometricAuthService();
    this.logger = logger;
  }
  
  /**
   * Generate registration options
   * POST /api/biometric/register/options
   */
  generateRegistrationOptions = async (req: any, res: any) => {
    try {
      const { organizationId, employeeId, userId } = req.user;
      const { deviceName } = req.body;
      
      const result = await this.service.generateRegistrationOptions(
        employeeId,
        organizationId,
        deviceName
      );
      
      res.json({
        success: true,
        options: result.options,
        employee: result.employee,
      });
    } catch (error: any) {
      this.logger.error('Error generating registration options:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
  
  /**
   * Verify registration response
   * POST /api/biometric/register/verify
   */
  verifyRegistration = async (req: any, res: any) => {
    try {
      const { organizationId, employeeId, userId } = req.user;
      const { response, expectedChallenge, deviceInfo } = req.body;
      
      if (!expectedChallenge) {
        return res.status(400).json({
          success: false,
          error: 'Expected challenge is required',
        });
      }
      
      const result = await this.service.verifyRegistration(
        employeeId,
        organizationId,
        response,
        expectedChallenge,
        deviceInfo,
        userId
      );
      
      res.status(201).json({
        success: true,
        credential: {
          id: result.credential.id,
          credentialId: result.credential.credential_id,
          deviceName: result.credential.device_name,
          deviceType: result.credential.device_type,
          platform: result.credential.platform,
          createdAt: result.credential.created_at,
        },
      });
    } catch (error: any) {
      this.logger.error('Error verifying registration:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
  
  /**
   * Generate authentication options
   * POST /api/biometric/authenticate/options
   */
  generateAuthenticationOptions = async (req: any, res: any) => {
    try {
      const { organizationId, employeeId } = req.user;
      
      const result = await this.service.generateAuthenticationOptions(
        employeeId,
        organizationId
      );
      
      res.json({
        success: true,
        options: result.options,
        credentialCount: result.credentialCount,
      });
    } catch (error: any) {
      this.logger.error('Error generating authentication options:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
  
  /**
   * Verify authentication response
   * POST /api/biometric/authenticate/verify
   */
  verifyAuthentication = async (req: any, res: any) => {
    try {
      const { organizationId, employeeId } = req.user;
      const { response, expectedChallenge } = req.body;
      
      if (!expectedChallenge) {
        return res.status(400).json({
          success: false,
          error: 'Expected challenge is required',
        });
      }
      
      const result = await this.service.verifyAuthentication(
        employeeId,
        organizationId,
        response,
        expectedChallenge
      );
      
      res.json({
        success: true,
        authenticated: result.success,
        employeeId: result.employeeId,
      });
    } catch (error: any) {
      this.logger.error('Error verifying authentication:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
  
  /**
   * Get employee's registered credentials
   * GET /api/biometric/credentials
   */
  getCredentials = async (req: any, res: any) => {
    try {
      const { organizationId, employeeId } = req.user;
      
      const credentials = await this.service.getEmployeeCredentials(
        employeeId,
        organizationId
      );
      
      // Return safe subset of credential data
      const safeCredentials = credentials.map(cred => ({
        id: cred.id,
        credentialId: cred.credential_id,
        deviceName: cred.device_name,
        deviceType: cred.device_type,
        platform: cred.platform,
        browser: cred.browser,
        isActive: cred.is_active,
        lastUsedAt: cred.last_used_at,
        useCount: cred.use_count,
        createdAt: cred.created_at,
      }));
      
      res.json({
        success: true,
        credentials: safeCredentials,
      });
    } catch (error: any) {
      this.logger.error('Error fetching credentials:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
  
  /**
   * Revoke a biometric credential
   * DELETE /api/biometric/credentials/:credentialId
   */
  revokeCredential = async (req: any, res: any) => {
    try {
      const { organizationId, userId } = req.user;
      const { credentialId } = req.params;
      
      const result = await this.service.revokeCredential(
        credentialId,
        organizationId,
        userId
      );
      
      res.json({
        success: true,
        credential: {
          id: result.id,
          credentialId: result.credential_id,
          revokedAt: result.deleted_at,
        },
      });
    } catch (error: any) {
      this.logger.error('Error revoking credential:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
}

export default BiometricAuthController;
