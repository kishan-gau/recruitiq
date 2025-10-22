import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'

// apply persisted theme on startup
try{
  const t = localStorage.getItem('recruitiq_theme')
  if(t === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}catch(e){}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
)
