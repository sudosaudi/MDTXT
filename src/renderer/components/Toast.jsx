import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toastMessage, toastVisible, updateInfo, updateDownloaded, handleInstallUpdate } = useApp()

  if (updateInfo) {
    const downloaded = updateDownloaded
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-surface border border-accent-soft"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <Download size={18} className="text-accent flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm text-text-primary font-semibold">
              {downloaded ? `Update v${updateInfo.version} ready` : `Update v${updateInfo.version} available`}
            </span>
            <span className="text-xs text-text-secondary">
              {downloaded ? 'Restart to apply' : 'Downloading…'}
            </span>
          </div>
          {downloaded && (
            <button
              onClick={handleInstallUpdate}
              className="ml-2 px-3 py-1 rounded-md bg-accent-soft hover:bg-accent text-accent hover:text-white text-xs font-semibold transition-colors"
            >
              Restart
            </button>
          )}
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
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-surface border border-border-strong"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            <AlertCircle size={18} className="text-accent flex-shrink-0" />
            <span className="text-sm text-text-primary">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
