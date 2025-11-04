import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import apiService from '../../services/api'

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = checking, true/false = result
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated via cookies
        await apiService.getMe()
        setIsAuthenticated(true)
      } catch (error) {
        setIsAuthenticated(false)
      }
    }
    
    checkAuth()
  }, [])
  
  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}
