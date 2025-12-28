// TODO: Worker management not yet implemented in ScheduleHubClient
// Stubbed out methods until backend implementation is complete
export const workersService = {
  async listWorkers(_filters?: any) {
    console.warn('Worker management not yet implemented');
    return [];
  },

  async getWorker(_id: string) {
    console.warn('Worker management not yet implemented');
    return null;
  },

  async createWorker(_data: any) {
    console.warn('Worker management not yet implemented');
    return null;
  },

  async updateWorker(_id: string, _data: any) {
    console.warn('Worker management not yet implemented');
    return null;
  },

  async deleteWorker(_id: string) {
    console.warn('Worker management not yet implemented');
  },

  async assignToShift(_workerId: string, _shiftId: string) {
    console.warn('Worker management not yet implemented');
    return null;
  },
};
