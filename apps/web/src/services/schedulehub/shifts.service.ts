// TODO: Shift management not yet implemented in ScheduleHubClient
// Stubbed out methods until backend implementation is complete
export const shiftsService = {
  /**
   * Lists all shifts with optional filters
   */
  async listShifts(_filters?: { startDate?: string; endDate?: string; stationId?: string }) {
    console.warn('Shift management not yet implemented');
    return [];
  },

  /**
   * Gets a single shift by ID
   */
  async getShift(_id: string) {
    console.warn('Shift management not yet implemented');
    return null;
  },

  /**
   * Creates a new shift
   */
  async createShift(_data: any) {
    console.warn('Shift management not yet implemented');
    return null;
  },

  /**
   * Updates an existing shift
   */
  async updateShift(_id: string, _updates: any) {
    console.warn('Shift management not yet implemented');
    return null;
  },

  /**
   * Deletes a shift (soft delete)
   */
  async deleteShift(_id: string) {
    console.warn('Shift management not yet implemented');
  },
};
