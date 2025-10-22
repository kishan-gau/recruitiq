import React from 'react'
export default function Card({children, className=''}){
  return <div className={`p-4 bg-white rounded shadow-sm ${className}`}>{children}</div>
}
