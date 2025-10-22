import React from 'react'

export default function SpriteIcon({ name, size = 16, className = '', title, ...props }){
  // Use external sprite file to allow static caching and SSR-friendly references
  const href = `/icons/sprite.svg#icon-${name}`
  return (
    <svg className={className} width={size} height={size} aria-hidden={title ? 'false' : 'true'} role={title ? 'img' : 'presentation'} {...props}>
      {title ? <title>{title}</title> : null}
      <use href={href} />
    </svg>
  )
}
