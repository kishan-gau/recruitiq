import React from 'react'

export default function SpriteIcon({ name, size = 16, className = '', title, ...props }){
  // Use inline sprite (rendered in main.jsx) instead of external file
  const href = `#icon-${name}`
  return (
    <svg className={className} width={size} height={size} aria-hidden={title ? 'false' : 'true'} role={title ? 'img' : 'presentation'} {...props}>
      {title ? <title>{title}</title> : null}
      <use href={href} />
    </svg>
  )
}
