import React, { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderOpen } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function DropZone({ children }) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const { setRootFolderPath, pendingFileRef } = useApp()

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const droppedPath = files[0].path
    if (!droppedPath) return

    const result = await window.electronAPI.scanFolder(droppedPath)
    if (result.error) {
      const sep = droppedPath.includes('\\') ? '\\' : '/'
      const parts = droppedPath.split(sep)
      parts.pop()
      const parentDir = parts.join(sep)
      if (parentDir) {
        pendingFileRef.current = droppedPath
        setRootFolderPath(parentDir)
      }
    } else {
      setRootFolderPath(droppedPath)
    }
  }, [setRootFolderPath, pendingFileRef])

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full w-full relative"
    >
      {children}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-4 px-12 py-10 rounded-2xl"
              style={{ border: '2px dashed var(--accent)', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            >
              <FolderOpen size={48} style={{ color: 'var(--accent)' }} />
              <span className="text-lg font-semibold text-white">Drop here to open</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
