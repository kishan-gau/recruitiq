import Customer from '../models/Customer.js'
import License from '../models/License.js'
import Instance from '../models/Instance.js'
import UsageEvent from '../models/UsageEvent.js'
import LicenseGenerator from '../services/LicenseGenerator.js'
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
