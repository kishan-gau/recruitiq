/**
 * Feedback Service
 * Handles performance feedback API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
import type { CreateFeedbackInput, Feedback } from '../types/feedback.types';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const feedbackService = {
  /**
   * Create feedback for an employee
   */
  async createFeedback(data: CreateFeedbackInput): Promise<Feedback> {
    const response = await nexusClient.createFeedback(data);
    return response.data.feedback || response.data;
  },

  /**
   * Get all feedback for an employee
   */
  async getEmployeeFeedback(employeeId: string): Promise<Feedback[]> {
    const response = await nexusClient.getEmployeeFeedback(employeeId);
    return response.data.feedback || response.data;
  },
};
