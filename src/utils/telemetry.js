export function trackEvent(name, props={}){
  // simple local shim - in prod this would forward to analytics backend
  try{ console.debug('[telemetry]', name, props) }catch(e){}
}

export default { trackEvent }
