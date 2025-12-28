import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// apply persisted theme on startup
try{
  const t = localStorage.getItem('recruitiq_theme')
  if(t === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}catch(e){}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
