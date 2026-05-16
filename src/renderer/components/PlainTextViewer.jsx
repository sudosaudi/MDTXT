import React from 'react'
import { useApp } from '../context/AppContext'

export default function PlainTextViewer({ content }) {
  const { zoomLevel } = useApp()

  if (!content) {
    return null
  }

  const lines = content.split('\n')
  const lineCount = lines.length
  const lineNumberWidth = String(lineCount).length * 10 + 24

  return (
    <div
      className="flex font-mono text-sm overflow-auto h-full"
      style={{ fontSize: zoomLevel + '%' }}
    >
      <div
        className="select-none text-right text-white/30 pr-4 pt-8 pb-8 min-w-[60px]"
        style={{ minWidth: lineNumberWidth }}
      >
        {lines.map((_, i) => (
          <div key={i} className="leading-[1.6]">
            {i + 1}
          </div>
        ))}
      </div>
      <div className="flex-1 bg-[#0f0f12] pt-8 pb-8">
        <pre
          className="whitespace-pre-wrap break-words text-white/80 leading-[1.6]"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          {content}
        </pre>
      </div>
    </div>
  )
}