import Customer from '../models/Customer.ts'
import License from '../models/License.ts'
import Instance from '../models/Instance.ts'
import UsageEvent from '../models/UsageEvent.ts'
import TierPreset from '../models/TierPreset.ts'
import LicenseGenerator from '../services/LicenseGenerator.ts'
import { addMonths } from 'date-fns'

export const customerController = {
  // Get all customers with filters
  getCustomers: async (req, res) => {
    try {
      const { tier, status, deploymentType, search } = req.query

      const filters = {}
      if (tier) filters.tier = tier
      if (status) filters.status = status
      if (deploymentType) filters.deploymentType = deploymentType
      if (search) filters.search = search

      const customers = await Customer.findAll(filters)

      res.json({ customers })
    } catch (error) {
      console.error('Get customers error:', error)
      res.status(500).json({ error: 'Failed to fetch customers' })
    }
  },

  // Get single customer
  getCustomer: async (req, res) => {
    try {
      const { id } = req.params

      const customer = await Customer.findById(id)

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' })
      }

      // Get usage stats
      const usageStats = await Customer.getUsageStats(id)
      const activity = await Customer.getActivity(id, 10)

      res.json({
        customer,
        usageStats,
        activity
      })
    } catch (error) {
      console.error('Get customer error:', error)
      res.status(500).json({ error: 'Failed to fetch customer' })
    }
  },

  // Create customer
  createCustomer: async (req, res) => {
    try {
      const customerData = req.body

      // Validate required fields
      const required = ['name', 'contactEmail', 'contactName', 'deploymentType', 'tier']
      const missing = required.filter(field => !customerData[field])
      
      if (missing.length > 0) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          fields: missing
        })
      }

      // Fetch tier preset to get limits
      const tierPreset = await TierPreset.getActivePreset(customerData.tier)
      
      if (!tierPreset) {
        return res.status(400).json({ 
          error: `No active tier preset found for tier: ${customerData.tier}`
        })
      }

      // Add tier limits to customer data
      customerData.maxUsers = tierPreset.max_users
      customerData.maxWorkspaces = tierPreset.max_workspaces
      customerData.maxJobs = tierPreset.max_jobs
      customerData.maxCandidates = tierPreset.max_candidates
      customerData.features = tierPreset.features || []
      customerData.tierPresetId = tierPreset.id

      // Set contract dates if not provided
      if (!customerData.contractStartDate) {
        customerData.contractStartDate = new Date()
      }
      if (!customerData.contractEndDate) {
        customerData.contractEndDate = addMonths(new Date(), customerData.contractMonths || 12)
      }

      const customer = await Customer.create(customerData)

      res.status(201).json({ customer })
    } catch (error) {
      console.error('Create customer error:', error)
      res.status(500).json({ error: 'Failed to create customer' })
    }
  },

  // Update customer
  updateCustomer: async (req, res) => {
    try {
      const { id } = req.params
      const updates = req.body

      const customer = await Customer.update(id, updates)

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' })
      }

      res.json({ customer })
    } catch (error) {
      console.error('Update customer error:', error)
      res.status(500).json({ error: 'Failed to update customer' })
    }
  },

  // Delete customer
  deleteCustomer: async (req, res) => {
    try {
      const { id } = req.params

      const customer = await Customer.delete(id)

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' })
      }

      res.json({ message: 'Customer deleted', customer })
    } catch (error) {
      console.error('Delete customer error:', error)
      res.status(500).json({ error: 'Failed to delete customer' })
    }
  },

  // Get customer usage trends
  getCustomerUsage: async (req, res) => {
    try {
      const { id } = req.params
      const { days = 30 } = req.query

      const summary = await UsageEvent.getSummary(id, parseInt(days))
      const trends = await UsageEvent.getTrends(id, parseInt(days))
      const currentCounts = await UsageEvent.getCurrentCounts(id)

      res.json({
        current: currentCounts,
        summary,
        trends
      })
    } catch (error) {
      console.error('Get customer usage error:', error)
      res.status(500).json({ error: 'Failed to fetch usage data' })
    }
  }
}
