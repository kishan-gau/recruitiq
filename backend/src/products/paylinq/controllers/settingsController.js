/**
 * Paylinq Settings Controller
 * Handles company and payroll configuration settings
 */

import logger from '../../../utils/logger.js';

/**
 * Get organization settings for Paylinq
 * @route GET /api/paylinq/settings
 */
export const getSettings = async (req, res) => {
  try {
    const { organizationId } = req;

    // For now, return default settings structure
    // In production, this would fetch from a settings table or organization metadata
    const settings = {
      company: {
        name: req.organization?.name || '',
        taxRegistrationNumber: '',
        email: req.organization?.email || '',
        phone: '',
        address: '',
        currency: 'SRD',
        timezone: 'America/Paramaribo',
        dateFormat: 'DD/MM/YYYY',
        language: 'en',
      },
      payroll: {
        payFrequency: 'biweekly',
        payDay: '15',
        thirteenthMonthEnabled: true,
        requireManagerApproval: true,
        requireHRReview: true,
        autoApproveScheduled: false,
      },
    };

    logger.info('Settings retrieved successfully', { organizationId });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error retrieving settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings',
      message: error.message,
    });
  }
};

/**
 * Update organization settings for Paylinq
 * @route PUT /api/paylinq/settings
 */
export const updateSettings = async (req, res) => {
  try {
    const { organizationId } = req;
    const { company, payroll } = req.body;

    // In production, save to database
    // For now, just validate and return success
    logger.info('Settings updated successfully', { 
      organizationId,
      sections: Object.keys(req.body),
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { company, payroll },
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message,
    });
  }
};

/**
 * Get company settings only
 * @route GET /api/paylinq/settings/company
 */
export const getCompanySettings = async (req, res) => {
  try {
    const settings = {
      name: req.organization?.name || '',
      taxRegistrationNumber: '',
      email: req.organization?.email || '',
      phone: '',
      address: '',
      currency: 'SRD',
      timezone: 'America/Paramaribo',
      dateFormat: 'DD/MM/YYYY',
      language: 'en',
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error retrieving company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve company settings',
      message: error.message,
    });
  }
};

/**
 * Update company settings
 * @route PUT /api/paylinq/settings/company
 */
export const updateCompanySettings = async (req, res) => {
  try {
    const { organizationId } = req;
    const companySettings = req.body;

    logger.info('Company settings updated', { organizationId });

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: companySettings,
    });
  } catch (error) {
    logger.error('Error updating company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update company settings',
      message: error.message,
    });
  }
};

/**
 * Get payroll settings only
 * @route GET /api/paylinq/settings/payroll
 */
export const getPayrollSettings = async (req, res) => {
  try {
    const settings = {
      payFrequency: 'biweekly',
      payDay: '15',
      thirteenthMonthEnabled: true,
      requireManagerApproval: true,
      requireHRReview: true,
      autoApproveScheduled: false,
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error retrieving payroll settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payroll settings',
      message: error.message,
    });
  }
};

/**
 * Update payroll settings
 * @route PUT /api/paylinq/settings/payroll
 */
export const updatePayrollSettings = async (req, res) => {
  try {
    const { organizationId } = req;
    const payrollSettings = req.body;

    logger.info('Payroll settings updated', { organizationId });

    res.json({
      success: true,
      message: 'Payroll settings updated successfully',
      data: payrollSettings,
    });
  } catch (error) {
    logger.error('Error updating payroll settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payroll settings',
      message: error.message,
    });
  }
};
