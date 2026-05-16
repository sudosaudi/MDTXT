import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toastMessage, toastVisible } = useApp()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {toastVisible && toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl glass border border-white/20 shadow-xl"
          >
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm text-white/80">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}