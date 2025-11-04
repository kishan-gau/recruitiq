import React from 'react'
import SpriteIcon from './SpriteIcon'
import SaveIcon from './SaveIcon'

// Render from the inline sprite in the browser. For server-side renders or fallbacks, we still support the SaveIcon component for 'save'.
export default function Icon({ name, size = 16, className = '', title, ...props }){
  // Use sprite-based icon in the client
  if(typeof window !== 'undefined'){
    return <SpriteIcon name={name} size={size} className={className} title={title} {...props} />
  }
  // Fallback for SSR/env without DOM: support save only, others return null
  if(name === 'save') return <SaveIcon size={size} className={className} {...props} />
  return null
}
