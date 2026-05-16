import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MarkdownRenderer from './MarkdownRenderer'
import PlainTextViewer from './PlainTextViewer'
import EmptyState from './EmptyState'
import { useApp } from '../context/AppContext'

export default function PreviewPane() {
  const { selectedFile, fileContent, fileError } = useApp()

  if (!selectedFile) {
    return <EmptyState message="Select a file to preview" icon="file" />
  }

  if (fileError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-lg mb-2">Could not load this file</p>
          <p className="text-white/20 text-sm">{fileError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedFile.path}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {selectedFile.extension === '.md' ? (
            <MarkdownRenderer content={fileContent} />
          ) : (
            <PlainTextViewer content={fileContent} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}