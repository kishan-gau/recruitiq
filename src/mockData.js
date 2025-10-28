// Mock data cleared - application is production-ready and connected to backend
const jobs = []
const candidates = []
const flowTemplates = []

export function getInitialData(){
  return { 
    jobs: [], 
    candidates: [],
    flowTemplates: []
  }
}

export default { jobs, candidates, flowTemplates }
