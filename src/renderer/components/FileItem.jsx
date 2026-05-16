import React from 'react'
import { FileText, AlignLeft } from 'lucide-react'

export default function FileItem({ file, isSelected, isFocused, onClick }) {
  const paddingLeft = 8 + file.depth * 16

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 py-2 px-3 cursor-pointer transition-all duration-150
        ${isSelected ? 'border-l-2 border-indigo-400 bg-indigo-400/10' : 'border-l-2 border-transparent'}
        ${isFocused ? 'bg-white/5' : 'hover:bg-white/5'}
      `}
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      {file.extension === '.md' ? (
        <FileText size={14} className="text-indigo-400 flex-shrink-0" />
      ) : (
        <AlignLeft size={14} className="text-emerald-400 flex-shrink-0" />
      )}
      <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/70'}`}>
        {file.name}
      </span>
    </div>
  )
}