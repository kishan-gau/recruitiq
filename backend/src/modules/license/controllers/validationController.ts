import LicenseValidator from '../services/LicenseValidator.ts'
import LicenseGenerator from '../services/LicenseGenerator.ts'

export const validationController = {
  // Validate license key
  validateLicense: async (req, res) => {
    try {
      const { licenseKey, instanceKey } = req.body

      if (!licenseKey || !instanceKey) {
        return res.status(400).json({ 
          error: 'License key and instance key required' 
        })
      }

      const validation = await LicenseValidator.validateLicense(licenseKey, instanceKey)

      res.json(validation)
    } catch (error) {
      console.error('Validation error:', error)
      res.status(500).json({ 
        valid: false,
        error: 'Validation failed' 
      })
    }
  },

  // Check feature access
  checkFeature: async (req, res) => {
    try {
      const { customerId, feature } = req.body

      if (!customerId || !feature) {
        return res.status(400).json({ 
          error: 'Customer ID and feature required' 
        })
      }

      const hasFeature = await LicenseValidator.hasFeature(customerId, feature)

      res.json({ 
        hasFeature,
        feature 
      })
    } catch (error) {
      console.error('Feature check error:', error)
      res.status(500).json({ 
        hasFeature: false,
        error: 'Feature check failed' 
      })
    }
  },

  // Check resource limit
  checkLimit: async (req, res) => {
    try {
      const { customerId, resourceType, currentCount } = req.body

      if (!customerId || !resourceType || currentCount === undefined) {
        return res.status(400).json({ 
          error: 'Customer ID, resource type, and current count required' 
        })
      }

      const limitCheck = await LicenseValidator.checkLimit(customerId, resourceType, currentCount)

      res.json(limitCheck)
    } catch (error) {
      console.error('Limit check error:', error)
      res.status(500).json({ 
        allowed: false,
        error: 'Limit check failed' 
      })
    }
  },

  // Check resource limit by instance key (PRE-ACTION CHECK for RecruitIQ)
  checkLimitByInstance: async (req, res) => {
    try {
      const { instanceKey, resourceType, currentCount } = req.body

      if (!instanceKey || !resourceType || currentCount === undefined) {
        return res.status(400).json({ 
          error: 'Instance key, resource type, and current count required' 
        })
      }

      const limitCheck = await LicenseValidator.checkLimitByInstance(instanceKey, resourceType, currentCount)

      res.json(limitCheck)
    } catch (error) {
      console.error('Check limit by instance error:', error)
      res.status(500).json({ 
        allowed: false,
        error: 'Limit check failed',
        message: 'Unable to verify resource limits. Please contact support.'
      })
    }
  },

  // Get full license details
  getLicenseDetails: async (req, res) => {
    try {
      const { customerId } = req.params

      const details = await LicenseValidator.getLicenseDetails(customerId)

      if (!details) {
        return res.status(404).json({ error: 'License not found' })
      }

      res.json(details)
    } catch (error) {
      console.error('Get license details error:', error)
      res.status(500).json({ error: 'Failed to fetch license details' })
    }
  },

  // Verify license file signature
  verifyLicenseFile: async (req, res) => {
    try {
      const { licenseFile } = req.body

      if (!licenseFile) {
        return res.status(400).json({ error: 'License file required' })
      }

      const result = await LicenseGenerator.parseLicenseFile(licenseFile)

      res.json(result)
    } catch (error) {
      console.error('Verify license file error:', error)
      res.status(500).json({ 
        valid: false,
        error: 'License file verification failed' 
      })
    }
  },

  // Get public key for instance configuration
  getPublicKey: async (req, res) => {
    try {
      const publicKey = await LicenseGenerator.getPublicKey()

      res.json({ 
        publicKey,
        algorithm: 'RSA-SHA256'
      })
    } catch (error) {
      console.error('Get public key error:', error)
      res.status(500).json({ error: 'Failed to fetch public key' })
    }
  },

  // Get validation history
  getValidationHistory: async (req, res) => {
    try {
      const { customerId } = req.params
      const { limit = 50 } = req.query

      const history = await LicenseValidator.getValidationHistory(customerId, parseInt(limit))

      res.json({ history })
    } catch (error) {
      console.error('Get validation history error:', error)
      res.status(500).json({ error: 'Failed to fetch validation history' })
    }
  }
}
