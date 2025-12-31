import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

class LicenseGenerator {
  /**
   * Generate a signed license file for on-premise deployments
   * @param {Object} licenseData - License details
   * @returns {Object} License file data with signature
   */
  static async generateLicenseFile(licenseData) {
    try {
      const {
        customer_id,
        customer_name,
        license_key,
        tier,
        max_users,
        max_workspaces,
        max_jobs,
        max_candidates,
        features,
        expires_at,
        instance_key,
        instance_url
      } = licenseData

      // Create license payload
      const payload = {
        version: '1.0',
        issuedAt: new Date().toISOString(),
        customer: {
          id: customer_id,
          name: customer_name
        },
        license: {
          key: license_key,
          tier,
          expiresAt: expires_at
        },
        instance: {
          key: instance_key,
          url: instance_url
        },
        limits: {
          maxUsers: max_users,
          maxWorkspaces: max_workspaces,
          maxJobs: max_jobs,
          maxCandidates: max_candidates
        },
        features: typeof features === 'string' ? JSON.parse(features) : features
      }

      // Sign the payload
      const signature = await this.signData(payload)

      // Create license file structure
      const licenseFile = {
        payload,
        signature,
        meta: {
          algorithm: 'RSA-SHA256',
          generatedAt: new Date().toISOString(),
          generatedBy: 'RecruitIQ License Manager'
        }
      }

      return licenseFile
    } catch (_error) {
      console.error('License file generation error:', error)
      throw new Error('Failed to generate license file')
    }
  }

  /**
   * Sign license data using RSA private key
   * @param {Object} data - Data to sign
   * @returns {string} Base64 encoded signature
   */
  static async signData(data) {
    try {
      const privateKeyPath = path.join(process.cwd(), 'keys', 'private.key')
      const privateKey = await fs.readFile(privateKeyPath, 'utf8')

      const dataString = JSON.stringify(data)
      const sign = crypto.createSign('RSA-SHA256')
      sign.update(dataString)
      sign.end()

      const signature = sign.sign(privateKey, 'base64')
      return signature
    } catch (_error) {
      console.error('Data signing error:', error)
      throw new Error('Failed to sign data - ensure RSA keys are generated')
    }
  }

  /**
   * Verify license file signature
   * @param {Object} licenseFile - License file with payload and signature
   * @returns {boolean} Whether signature is valid
   */
  static async verifySignature(licenseFile) {
    try {
      const publicKeyPath = path.join(process.cwd(), 'keys', 'public.key')
      const publicKey = await fs.readFile(publicKeyPath, 'utf8')

      const { payload, signature } = licenseFile
      const dataString = JSON.stringify(payload)

      const verify = crypto.createVerify('RSA-SHA256')
      verify.update(dataString)
      verify.end()

      return verify.verify(publicKey, signature, 'base64')
    } catch (_error) {
      console.error('Signature verification error:', error)
      return false
    }
  }

  /**
   * Parse and validate a license file
   * @param {Object} licenseFile - License file to parse
   * @returns {Object} Parsed and validated license data or null if invalid
   */
  static async parseLicenseFile(licenseFile) {
    try {
      // Verify signature
      const isValid = await this.verifySignature(licenseFile)
      
      if (!isValid) {
        return {
          valid: false,
          reason: 'Invalid signature - license file has been tampered with'
        }
      }

      const { payload } = licenseFile

      // Check expiration
      const expiresAt = new Date(payload.license.expiresAt)
      const now = new Date()
      
      if (expiresAt < now) {
        return {
          valid: false,
          reason: 'License has expired',
          data: payload
        }
      }

      return {
        valid: true,
        reason: 'License file is valid',
        data: payload
      }
    } catch (_error) {
      console.error('License file parsing error:', error)
      return {
        valid: false,
        reason: 'Failed to parse license file'
      }
    }
  }

  /**
   * Generate a license key
   * @param {string} tier - License tier
   * @param {string} instanceKey - Instance identifier
   * @returns {string} Generated license key
   */
  static generateLicenseKey(tier, instanceKey) {
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex').toUpperCase()
    const tierPrefix = tier.substring(0, 3).toUpperCase()
    const instanceHash = crypto
      .createHash('md5')
      .update(instanceKey)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase()

    return `RIQ-${tierPrefix}-${instanceHash}-${timestamp}-${random}`
  }

  /**
   * Get public key for distribution to instances
   * @returns {string} Public key content
   */
  static async getPublicKey() {
    try {
      const publicKeyPath = path.join(process.cwd(), 'keys', 'public.key')
      return await fs.readFile(publicKeyPath, 'utf8')
    } catch (_error) {
      console.error('Get public key error:', error)
      throw new Error('Failed to read public key')
    }
  }
}

export default LicenseGenerator
