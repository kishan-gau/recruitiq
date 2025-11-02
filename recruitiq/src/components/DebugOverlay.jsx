import React, {useEffect, useState} from 'react'

export default function DebugOverlay(){
  const [info, setInfo] = useState(null)

  useEffect(()=>{
    if(!location.search.includes('debug=1')) return
    const sheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l=>({href:l.href, disabled:l.disabled}))
    const cssText = sheetLinks.length ? 'linked stylesheets: ' + sheetLinks.map(s=>s.href.split('/').pop()).join(', ') : 'no stylesheets'

    // create a temp element to inspect computed style for .text-2xl
    const el = document.createElement('h1')
    el.className = 'text-2xl font-bold'
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.textContent = 'debug'
    document.body.appendChild(el)
    const cs = getComputedStyle(el)
    const fontSize = cs.fontSize
    const fontWeight = cs.fontWeight
    el.remove()

    setInfo({cssText, fontSize, fontWeight, userAgent: navigator.userAgent})
  },[])

  if(!location.search.includes('debug=1')) return null
  return (
    <div style={{position:'fixed',right:12,top:12,background:'#fff',color:'#000',padding:12,borderRadius:8,zIndex:9999,boxShadow:'0 6px 18px rgba(0,0,0,0.12)'}}>
      <strong>Debug overlay</strong>
      {info ? (
        <div style={{fontSize:12,marginTop:8}}>
          <div>{info.cssText}</div>
          <div>Computed .text-2xl: {info.fontSize} / weight: {info.fontWeight}</div>
          <div style={{marginTop:6,color:'#666'}}>UA: {info.userAgent}</div>
        </div>
      ) : <div style={{fontSize:12}}>Not active</div>}
    </div>
  )
}
