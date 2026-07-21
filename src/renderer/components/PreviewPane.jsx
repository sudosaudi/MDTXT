import React, { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MarkdownRenderer from './MarkdownRenderer'
import PlainTextViewer from './PlainTextViewer'
import EmptyState from './EmptyState'
import { useFiles } from '../context/FilesContext'
import { getWordCount, getReadTimeMinutes } from '../lib/text'

export default function PreviewPane() {
  const { selectedFile, fileContent, fileError } = useFiles()

  const wordCount = useMemo(
    () => getWordCount(fileContent, selectedFile?.extension),
    [fileContent, selectedFile]
  )
  const readTime = useMemo(() => getReadTimeMinutes(wordCount), [wordCount])

  if (!selectedFile) {
    return <EmptyState message="Select a file to preview" icon="file" />
  }

  if (fileError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-6">
          <p className="text-text-secondary text-base mb-2">Could not load this file</p>
          <p className="text-text-muted text-sm">{fileError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg-primary transition-colors duration-200">
      {/* tabIndex makes the pane focusable so arrow-key scrolling works here
          (the sidebar's key handler yields to focused elements). */}
      <div className="flex-1 overflow-auto min-h-0 focus:outline-none" tabIndex={0}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedFile.path}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
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
      {fileContent && (
        <div className="flex-shrink-0 px-4 py-1.5 border-t border-border-subtle bg-bg-sidebar transition-colors duration-200">
          <span className="text-xs text-text-muted">
            {wordCount.toLocaleString()} words · {readTime} min read
          </span>
        </div>
      )}
    </div>
  )
}
