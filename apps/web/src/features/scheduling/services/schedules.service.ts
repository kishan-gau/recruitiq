// TODO: Schedule management not yet implemented in ScheduleHubClient
// Stubbed out methods until backend implementation is complete
export const schedulesService = {
  async listSchedules(_filters?: any) {
    console.warn('Schedule management not yet implemented');
    return [];
  },

  async getSchedule(_id: string) {
    console.warn('Schedule management not yet implemented');
    return null;
  },

  async createSchedule(_data: any) {
    console.warn('Schedule management not yet implemented');
    return null;
  },

  async updateSchedule(_id: string, _data: any) {
    console.warn('Schedule management not yet implemented');
    return null;
  },

  async deleteSchedule(_id: string) {
    console.warn('Schedule management not yet implemented');
  },

  async publishSchedule(_id: string) {
    console.warn('Schedule management not yet implemented');
    return null;
  },
};
