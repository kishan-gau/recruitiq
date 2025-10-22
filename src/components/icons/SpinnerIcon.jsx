import React from 'react'

export default function SpinnerIcon({ className = '', size = 16, ...props }){
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="60" strokeDashoffset="20"></circle>
    </svg>
  )
}
