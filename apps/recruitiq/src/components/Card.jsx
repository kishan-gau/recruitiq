import React from 'react'

// Memoize to prevent unnecessary re-renders when used in lists
const Card = React.memo(function Card({children, className=''}){
  return <div className={`p-4 bg-white rounded shadow-sm ${className}`}>{children}</div>
})

export default Card
