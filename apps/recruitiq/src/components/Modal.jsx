import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Enterprise-grade Modal Component with React Portal
 * 
 * Renders modal content at the root level of the DOM (outside the component hierarchy)
 * to prevent z-index stacking context issues and ensure proper layering.
 * 
 * Features:
 * - React Portal rendering (DOM isolation)
 * - Escape key handler
 * - Focus trap for accessibility
 * - Body scroll lock when open
 * - Click-outside-to-close
 * - Smooth animations with Framer Motion
 * 
 * @param {boolean} open - Whether the modal is open
 * @param {string} title - Modal title
 * @param {function} onClose - Close handler
 * @param {ReactNode} children - Modal content
 * @param {string} size - Modal size (sm, md, lg, xl, full)
 * @param {string} zIndex - Custom z-index (default: z-50)
 */
export default function Modal({open, title, onClose, children, size = 'md', zIndex = 'z-50'}){
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-7xl'
  }
  
  // Handle escape key
  useEffect(() => {
    if (!open) return
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      // Save the currently focused element
      previousActiveElement.current = document.activeElement
      
      // Prevent body scroll
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      
      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus()
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [open])
  
  // Handle focus trap
  useEffect(() => {
    if (!open || !modalRef.current) return
    
    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    const handleTab = (e) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    modal.addEventListener('keydown', handleTab)
    return () => modal.removeEventListener('keydown', handleTab)
  }, [open])
  
  // Create portal content
  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div 
          className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          style={{ isolation: 'isolate' }} // Create new stacking context
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={onClose}
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.18 }}
            aria-hidden="true"
          />

          {/* Modal Dialog */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            className={`relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
            initial={{ opacity: 0, y: 12, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.995 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 
                  id="modal-title"
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                >
                  {title}
                </h3>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
  
  // Render modal at root level using Portal
  // This ensures the modal is always rendered outside the component hierarchy,
  // preventing z-index stacking context issues
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}
