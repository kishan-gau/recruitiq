/**
 * Template Pay Structure Service
 * 
 * Handles API calls for template-based pay structure operations
 */

import { PaylinqClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const paylinqClient = new PaylinqClient(apiClient);

/**
 * Service for managing template-based pay structures
 */
export const templatePayStructureService = {
  /**
   * Fetches available templates for a worker type
   */
  async getAvailableTemplates(workerTypeCode: string) {
    const response = await paylinqClient.getWorkerTypeTemplates(workerTypeCode);
    return response.data;
  },

  /**
   * Upgrades worker type to use template-based pay structure
   */
  async upgradeToTemplate(workerTypeCode: string, templateCode: string) {
    const response = await paylinqClient.upgradeWorkerTypeToTemplate(
      workerTypeCode,
      templateCode
    );
    return response.data;
  },

  /**
   * Applies overrides to template-based components
   */
  async applyOverrides(workerTypeCode: string, overrides: any) {
    const response = await paylinqClient.applyTemplateOverrides(
      workerTypeCode,
      overrides
    );
    return response.data;
  },

  /**
   * Resets worker type to custom pay structure
   */
  async resetToCustom(workerTypeCode: string) {
    const response = await paylinqClient.resetWorkerTypeToCustom(workerTypeCode);
    return response.data;
  },

  /**
   * Gets template comparison data
   */
  async compareWithTemplate(workerTypeCode: string, templateCode: string) {
    const response = await paylinqClient.compareWorkerTypeWithTemplate(
      workerTypeCode,
      templateCode
    );
    return response.data;
  },

  /**
   * Gets upgrade preview
   */
  async previewUpgrade(workerTypeCode: string, templateCode: string) {
    const response = await paylinqClient.previewTemplateUpgrade(
      workerTypeCode,
      templateCode
    );
    return response.data;
  },
};
