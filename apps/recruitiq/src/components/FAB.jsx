import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './icons'
import { motion, AnimatePresence } from 'framer-motion'

export default function FAB({hidden=false}){
  const navigate = useNavigate()
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          aria-label="New"
          onClick={()=> navigate('/jobs/new')}
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ duration: 0.18 }}
          className="md:hidden fixed right-4 bottom-6 w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center z-50 focus-ring"
        >
          <Icon name="plus" className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
