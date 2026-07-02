import React, { useEffect, useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MarkdownRenderer from './MarkdownRenderer'
import PlainTextViewer from './PlainTextViewer'
import EmptyState from './EmptyState'
import { useApp } from '../context/AppContext'

function getWordCount(text) {
  if (!text) return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

function getReadTime(wordCount) {
  const minutes = Math.ceil(wordCount / 200)
  return minutes < 1 ? '< 1' : minutes.toString()
}

function formatCount(n) {
  return n.toLocaleString()
}

export default function PreviewPane() {
  const { selectedFile, fileContent, fileError } = useApp()
  const [themeClass, setThemeClass] = useState('theme-dark')

  useEffect(() => {
    const update = () => {
      setThemeClass(document.documentElement.classList.contains('theme-light') ? 'theme-light' : 'theme-dark')
    }
    update()
    const handler = () => update()
    window.addEventListener('mdtxt:theme-change', handler)
    return () => window.removeEventListener('mdtxt:theme-change', handler)
  }, [])

  const wordCount = useMemo(() => getWordCount(fileContent), [fileContent])
  const readTime = useMemo(() => getReadTime(wordCount), [wordCount])

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
      <div className="flex-1 overflow-auto min-h-0">
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
              <MarkdownRenderer content={fileContent} themeClass={themeClass} />
            ) : (
              <PlainTextViewer content={fileContent} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {fileContent && (
        <div className="flex-shrink-0 px-4 py-1.5 border-t border-border-subtle bg-bg-sidebar transition-colors duration-200">
          <span className="text-xs text-text-muted">
            {formatCount(wordCount)} words · {readTime} min read
          </span>
        </div>
      )}
    </div>
  )
}
