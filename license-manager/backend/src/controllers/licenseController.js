import License from '../models/License.js'
import Customer from '../models/Customer.js'
import LicenseGenerator from '../services/LicenseGenerator.js'
import { addMonths } from 'date-fns'

export const licenseController = {
  // Get license by ID
  getLicense: async (req, res) => {
    try {
      const { id } = req.params

      const license = await License.findById(id)

      if (!license) {
        return res.status(404).json({ error: 'License not found' })
      }

      res.json({ license })
    } catch (error) {
      console.error('Get license error:', error)
      res.status(500).json({ error: 'Failed to fetch license' })
    }
  },

  // Create license
  createLicense: async (req, res) => {
    try {
      const licenseData = req.body

      // Validate required fields
      const required = ['customerId', 'instanceId', 'tier']
      const missing = required.filter(field => !licenseData[field])
      
      if (missing.length > 0) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          fields: missing
        })
      }

      // Set expiration date if not provided
      if (!licenseData.expiresAt) {
        licenseData.expiresAt = addMonths(new Date(), 12)
      }

      const license = await License.create(licenseData)

      res.status(201).json({ license })
    } catch (error) {
      console.error('Create license error:', error)
      res.status(500).json({ error: 'Failed to create license' })
    }
  },

  // Update license
  updateLicense: async (req, res) => {
    try {
      const { id } = req.params
      const updates = req.body

      const license = await License.update(id, updates)

      if (!license) {
        return res.status(404).json({ error: 'License not found' })
      }

      res.json({ license })
    } catch (error) {
      console.error('Update license error:', error)
      res.status(500).json({ error: 'Failed to update license' })
    }
  },

  // Renew license
  renewLicense: async (req, res) => {
    try {
      const { id } = req.params
      const { months = 12 } = req.body

      const license = await License.renew(id, months)

      if (!license) {
        return res.status(404).json({ error: 'License not found' })
      }

      res.json({ 
        license,
        message: `License renewed for ${months} months`
      })
    } catch (error) {
      console.error('Renew license error:', error)
      res.status(500).json({ error: 'Failed to renew license' })
    }
  },

  // Suspend license
  suspendLicense: async (req, res) => {
    try {
      const { id } = req.params

      const license = await License.suspend(id)

      if (!license) {
        return res.status(404).json({ error: 'License not found' })
      }

      res.json({ 
        license,
        message: 'License suspended'
      })
    } catch (error) {
      console.error('Suspend license error:', error)
      res.status(500).json({ error: 'Failed to suspend license' })
    }
  },

  // Reactivate license
  reactivateLicense: async (req, res) => {
    try {
      const { id } = req.params

      const license = await License.reactivate(id)

      if (!license) {
        return res.status(404).json({ error: 'License not found' })
      }

      res.json({ 
        license,
        message: 'License reactivated'
      })
    } catch (error) {
      console.error('Reactivate license error:', error)
      res.status(500).json({ error: 'Failed to reactivate license' })
    }
  },

  // Generate license file (.lic) for on-premise deployments
  generateLicenseFile: async (req, res) => {
    try {
      const { id } = req.params

      const license = await License.findById(id)

      if (!license) {
        return res.status(404).json({ error: 'License not found' })
      }

      // Generate signed license file
      const licenseFile = await LicenseGenerator.generateLicenseFile({
        customer_id: license.customer_id,
        customer_name: license.customer_name,
        license_key: license.license_key,
        tier: license.tier,
        max_users: license.max_users,
        max_workspaces: license.max_workspaces,
        max_jobs: license.max_jobs,
        max_candidates: license.max_candidates,
        features: license.features,
        expires_at: license.expires_at,
        instance_key: license.instance_key,
        instance_url: license.instance_url
      })

      // Save license file to database
      await License.update(id, { 
        license_file: licenseFile 
      })

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="recruitiq-${license.instance_key}.lic"`)

      res.json(licenseFile)
    } catch (error) {
      console.error('Generate license file error:', error)
      res.status(500).json({ error: 'Failed to generate license file' })
    }
  },

  // Get expiring licenses
  getExpiringLicenses: async (req, res) => {
    try {
      const { days = 30 } = req.query

      const licenses = await License.getExpiring(parseInt(days))

      res.json({ licenses })
    } catch (error) {
      console.error('Get expiring licenses error:', error)
      res.status(500).json({ error: 'Failed to fetch expiring licenses' })
    }
  },

  // Delete license
  deleteLicense: async (req, res) => {
    try {
      const { id } = req.params

      const license = await License.delete(id)

      if (!license) {
        return res.status(404).json({ error: 'License not found' })
      }

      res.json({ message: 'License deleted', license })
    } catch (error) {
      console.error('Delete license error:', error)
      res.status(500).json({ error: 'Failed to delete license' })
    }
  }
}
