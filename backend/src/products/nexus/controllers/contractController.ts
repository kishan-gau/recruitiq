/**
 * ContractController
 * HTTP request handlers for contract management
 */

import ContractService from '../services/contractService.js';
import logger from '../../../utils/logger.js';

class ContractController {
  constructor() {
    this.service = new ContractService();
    this.logger = logger;
  }

  /**
   * Create a new contract
   * POST /api/nexus/contracts
   */
  createContract = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const contract = await this.service.createContract(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: contract });
    } catch (_error) {
      this.logger.error('Error in createContract controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get contract by ID
   * GET /api/nexus/contracts/:id
   */
  getContract = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const contract = await this.service.getContract(id, organizationId);
      res.json({ success: true, data: contract });
    } catch (_error) {
      this.logger.error('Error in getContract controller', { error: error.message });
      const status = error.message === 'Contract not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * List contracts with filters
   * GET /api/nexus/contracts
   */
  listContracts = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId, status, contractType, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (employeeId) filters.employeeId = employeeId;
      if (status) filters.status = status;
      if (contractType) filters.contractType = contractType;

      const options = { limit: parseInt(limit), offset: parseInt(offset) };

      const contracts = await this.service.listContracts(filters, organizationId, options);
      res.json({ success: true, data: contracts });
    } catch (_error) {
      this.logger.error('Error in listContracts controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Update contract
   * PATCH /api/nexus/contracts/:id
   */
  updateContract = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const contract = await this.service.updateContract(id, req.body, organizationId, userId);
      res.json({ success: true, data: contract });
    } catch (_error) {
      this.logger.error('Error in updateContract controller', { error: error.message });
      const status = error.message === 'Contract not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Activate contract
   * POST /api/nexus/contracts/:id/activate
   */
  activateContract = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const contract = await this.service.activateContract(id, organizationId, userId);
      res.json({ success: true, data: contract });
    } catch (_error) {
      this.logger.error('Error in activateContract controller', { error: error.message });
      const status = error.message === 'Contract not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Terminate contract
   * POST /api/nexus/contracts/:id/terminate
   */
  terminateContract = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const { terminationDate, reason } = req.body;
      
      const contract = await this.service.terminateContract(
        id, 
        terminationDate, 
        reason, 
        organizationId, 
        userId
      );
      res.json({ success: true, data: contract });
    } catch (_error) {
      this.logger.error('Error in terminateContract controller', { error: error.message });
      const status = error.message === 'Contract not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Progress contract sequence step
   * POST /api/nexus/contracts/:id/progress-sequence
   */
  progressSequence = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const contract = await this.service.progressSequenceStep(id, organizationId, userId);
      res.json({ success: true, data: contract });
    } catch (_error) {
      this.logger.error('Error in progressSequence controller', { error: error.message });
      const status = error.message === 'Contract not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get expiring contracts
   * GET /api/nexus/contracts/expiring
   */
  getExpiringContracts = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { daysAhead = 30 } = req.query;
      
      const contracts = await this.service.getExpiringContracts(
        parseInt(daysAhead), 
        organizationId
      );
      res.json({ success: true, data: contracts });
    } catch (_error) {
      this.logger.error('Error in getExpiringContracts controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee contracts
   * GET /api/nexus/contracts/employee/:employeeId
   */
  getEmployeeContracts = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId } = req.params;
      const contracts = await this.service.getEmployeeContracts(employeeId, organizationId);
      res.json({ success: true, data: contracts });
    } catch (_error) {
      this.logger.error('Error in getEmployeeContracts controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default ContractController;
