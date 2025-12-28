// TODO: Pipeline functionality not yet implemented in RecruitIQAPI
// Stubbed out methods until backend implementation is complete
export const pipelineService = {
  async listPipelines(_filters?: any) {
    console.warn('Pipeline functionality not yet implemented');
    return [];
  },

  async getPipeline(_id: string) {
    console.warn('Pipeline functionality not yet implemented');
    return null;
  },

  async createPipeline(_data: any) {
    console.warn('Pipeline functionality not yet implemented');
    return null;
  },

  async updatePipeline(_id: string, _data: any) {
    console.warn('Pipeline functionality not yet implemented');
    return null;
  },

  async deletePipeline(_id: string) {
    console.warn('Pipeline functionality not yet implemented');
  },

  async moveCandidateToPipelineStage(_candidateId: string, _pipelineId: string, _stageId: string) {
    console.warn('Pipeline functionality not yet implemented');
    return null;
  },
};
