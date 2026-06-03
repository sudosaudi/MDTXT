import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toastMessage, toastVisible, updateInfo, handleInstallUpdate } = useApp()

  if (updateInfo) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl glass border border-amber-500/30 shadow-xl"
        >
          <Download size={18} className="text-amber-400 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm text-white/90 font-medium">
              Update v{updateInfo.version} ready
            </span>
            <span className="text-xs text-white/50">
              Restart to apply
            </span>
          </div>
          <button
            onClick={handleInstallUpdate}
            className="ml-2 px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium transition-colors"
          >
            Restart
          </button>
        </motion.div>
      </div>
    )
  }

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