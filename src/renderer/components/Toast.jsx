import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, Download } from 'lucide-react'
import { useUI } from '../context/UIContext'

const TOAST_STYLES = {
  success: { Icon: CheckCircle2, className: 'text-emerald-400' },
  error: { Icon: AlertCircle, className: 'text-red-400' },
  info: { Icon: Info, className: 'text-accent' }
}

export default function Toast() {
  const { toastMessage, toastType, toastVisible, updateInfo, updateDownloaded, handleInstallUpdate } = useUI()

  // The update card and regular toasts coexist: previously an active update
  // notification permanently suppressed every normal toast for the session.
  const { Icon, className: iconClass } = TOAST_STYLES[toastType] || TOAST_STYLES.info

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {updateInfo && (
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
              {updateDownloaded ? `Update v${updateInfo.version} ready` : `Update v${updateInfo.version} available`}
            </span>
            <span className="text-xs text-text-secondary">
              {updateDownloaded ? 'Restart to apply' : 'Downloading…'}
            </span>
          </div>
          {updateDownloaded && (
            <button
              onClick={handleInstallUpdate}
              className="ml-2 px-3 py-1 rounded-md bg-accent-soft hover:bg-accent text-accent hover:text-white text-xs font-semibold transition-colors"
            >
              Restart
            </button>
          )}
        </motion.div>
      )}

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
            <Icon size={18} className={`${iconClass} flex-shrink-0`} />
            <span className="text-sm text-text-primary">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
