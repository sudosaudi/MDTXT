import React from 'react'
import { FileText, AlignLeft } from 'lucide-react'

export default function FileItem({ file, isSelected, isFocused, onClick }) {
  const paddingLeft = 8 + file.depth * 16
  const depthOpacity = Math.max(0.5, 0.7 - file.depth * 0.08)

  const guides = []
  for (let i = 1; i <= file.depth; i++) {
    guides.push(
      <div
        key={i}
        className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
        style={{ left: `${10 + (i - 1) * 16}px` }}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-2 py-2 px-3 cursor-pointer transition-all duration-150
        ${isSelected ? 'border-l-2 border-indigo-400 bg-indigo-400/10' : 'border-l-2 border-transparent'}
        ${isFocused ? 'bg-white/5' : 'hover:bg-white/5'}
      `}
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      {guides}
      {file.extension === '.md' ? (
        <FileText size={14} className="text-indigo-400 flex-shrink-0" />
      ) : (
        <AlignLeft size={14} className="text-emerald-400 flex-shrink-0" />
      )}
      <span
        className={`text-sm font-medium truncate ${isSelected ? 'text-white' : ''}`}
        style={{ color: isSelected ? undefined : `rgba(255,255,255,${depthOpacity})` }}
      >
        {file.name}
      </span>
    </div>
  )
}