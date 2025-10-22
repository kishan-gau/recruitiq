import React from 'react'

export default function Sprite(){
  return (
    <svg aria-hidden="true" style={{position:'absolute', width:0, height:0, overflow:'hidden'}}>
      <defs>
        <symbol id="icon-save" viewBox="0 0 24 24">
          <path d="M5 4h11l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3v4a1 1 0 0 0 1 1h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="7" y="11" width="10" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>

        <symbol id="icon-menu" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>

        <symbol id="icon-spinner" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="20" />
        </symbol>

        {/* Additional icons converted from existing inline icons */}
        <symbol id="icon-plus" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" fill="currentColor"/>
        </symbol>

        <symbol id="icon-close" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" fill="currentColor"/>
        </symbol>

        <symbol id="icon-dashboard" viewBox="0 0 24 24">
          <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6M3 21h8v-8H3v8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>

        <symbol id="icon-briefcase" viewBox="0 0 24 24">
          <path d="M3 7a2 2 0 012-2h3l2 2h6l2-2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM8 7v2m8-2v2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>

        <symbol id="icon-users" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 00-3-3.87M9 21v-2a4 4 0 013-3.87M7 7a4 4 0 118 0 4 4 0 01-8 0z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>

        <symbol id="icon-kanban" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="3" width="7" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="11" width="7" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="3" y="11" width="7" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        </symbol>

        <symbol id="icon-search" viewBox="0 0 20 20">
          <path d="M11 11l4 4M6.5 11A4.5 4.5 0 1011 6.5 4.5 4.5 0 006.5 11z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>
      </defs>
    </svg>
  )
}
