import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const interviewsService = {
  /**
   * Lists all interviews with optional filters
   */
  async listInterviews(filters?: {
    page?: number;
    limit?: number;
    candidateId?: string;
    jobId?: string;
    interviewerId?: string;
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await recruitiqClient.getInterviews(filters);
    return response.interviews || response.data;
  },

  /**
   * Gets a single interview by ID
   */
  async getInterview(id: string) {
    const response = await recruitiqClient.getInterview(id);
    return response.interview || response.data;
  },

  /**
   * Creates a new interview
   */
  async createInterview(data: {
    candidateId: string;
    jobId: string;
    interviewerIds: string[];
    scheduledAt: string;
    duration: number;
    type: string;
    location?: string;
    meetingLink?: string;
    notes?: string;
    agenda?: string;
  }) {
    const response = await recruitiqClient.createInterview(data);
    return response.interview || response.data;
  },

  /**
   * Updates an existing interview
   */
  async updateInterview(id: string, updates: Partial<any>) {
    const response = await recruitiqClient.updateInterview(id, updates);
    return response.interview || response.data;
  },

  /**
   * Cancels an interview
   */
  async cancelInterview(id: string, reason?: string) {
    const response = await recruitiqClient.cancelInterview(id, { reason });
    return response.data || response;
  },

  /**
   * Reschedules an interview
   */
  async rescheduleInterview(id: string, data: {
    scheduledAt: string;
    reason?: string;
    notifyCandidates?: boolean;
    notifyInterviewers?: boolean;
  }) {
    const response = await recruitiqClient.rescheduleInterview(id, data);
    return response.interview || response.data;
  },

  /**
   * Completes an interview and submits feedback
   */
  async completeInterview(id: string, feedback: {
    rating: number;
    notes: string;
    recommendation: string;
    skills?: Array<{ name: string; rating: number }>;
    cultureFit?: number;
    technicalAbility?: number;
    communication?: number;
  }) {
    const response = await recruitiqClient.completeInterview(id, feedback);
    return response.interview || response.data;
  },

  /**
   * Gets interview feedback for a candidate
   */
  async getInterviewFeedback(candidateId: string) {
    const response = await recruitiqClient.getInterviewFeedback(candidateId);
    return response.feedback || response.data;
  },

  /**
   * Gets interviewer availability
   */
  async getInterviewerAvailability(interviewerId: string, filters?: {
    startDate?: string;
    endDate?: string;
    duration?: number;
  }) {
    const response = await recruitiqClient.getInterviewerAvailability(interviewerId, filters);
    return response.availability || response.data;
  },

  /**
   * Sets interviewer availability
   */
  async setInterviewerAvailability(interviewerId: string, availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    timezone?: string;
  }>) {
    const response = await recruitiqClient.setInterviewerAvailability(interviewerId, { availability });
    return response.data || response;
  },

  /**
   * Gets interview statistics
   */
  async getInterviewStatistics(filters?: {
    dateRange?: string;
    interviewerId?: string;
    jobId?: string;
    type?: string;
  }) {
    const response = await recruitiqClient.getInterviewStatistics(filters);
    return response.statistics || response.data;
  },

  /**
   * Sends interview reminders
   */
  async sendInterviewReminder(id: string, type: 'candidate' | 'interviewer' | 'all') {
    const response = await recruitiqClient.sendInterviewReminder(id, { type });
    return response.data || response;
  },

  /**
   * Gets candidate's interview schedule
   */
  async getCandidateInterviews(candidateId: string, filters?: {
    status?: string;
    upcoming?: boolean;
  }) {
    const response = await recruitiqClient.getCandidateInterviews(candidateId, filters);
    return response.interviews || response.data;
  },

  /**
   * Gets interviewer's schedule
   */
  async getInterviewerSchedule(interviewerId: string, filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const response = await recruitiqClient.getInterviewerSchedule(interviewerId, filters);
    return response.interviews || response.data;
  },

  /**
   * Bulk schedules interviews
   */
  async bulkScheduleInterviews(data: Array<{
    candidateId: string;
    jobId: string;
    interviewerIds: string[];
    scheduledAt: string;
    type: string;
  }>) {
    const response = await recruitiqClient.bulkScheduleInterviews({ interviews: data });
    return response.data || response;
  }
};