import React, { useRef } from 'react'
import { useUI } from '../context/UIContext'
import { useFiles } from '../context/FilesContext'
import HighlightableViewer from './HighlightableViewer'

export default function PlainTextViewer({ content }) {
  const { zoomLevel } = useUI()
  const { selectedFile } = useFiles()
  const contentRef = useRef(null)

  if (!content) {
    return null
  }

  const lines = content.split('\n')
  const lineCount = lines.length
  const lineNumberWidth = String(lineCount).length * 10 + 24

  return (
    <div
      className="flex font-mono text-sm overflow-auto h-full bg-bg-primary text-text-primary"
      style={{ fontSize: zoomLevel + '%' }}
    >
      <div
        className="select-none text-right pr-4 pt-8 pb-8 min-w-[60px] text-text-muted"
        style={{ minWidth: lineNumberWidth }}
      >
        {lines.map((_, i) => (
          <div key={i} className="leading-[1.6]">
            {i + 1}
          </div>
        ))}
      </div>
      <HighlightableViewer filePath={selectedFile?.path} scopeRef={contentRef}>
        <div ref={contentRef} className="flex-1 pt-8 pb-8">
          <pre
            className="whitespace-pre-wrap break-words text-text-primary leading-[1.6]"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {content}
          </pre>
        </div>
      </HighlightableViewer>
    </div>
  )
}
