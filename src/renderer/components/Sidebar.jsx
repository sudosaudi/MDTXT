import React, { useState, useCallback, useMemo, useRef } from 'react'
import { FolderOpen, Search, X } from 'lucide-react'
import FileItem from './FileItem'
import { useApp } from '../context/AppContext'

export default function Sidebar() {
  const { rootFolderPath, files, selectedFile, setSelectedFile, searchQuery, setSearchQuery } = useApp()
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef(null)

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files
    const q = searchQuery.toLowerCase()
    return files.filter(
      (f) => f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q)
    )
  }, [files, searchQuery])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && searchQuery) {
      e.preventDefault()
      e.stopPropagation()
      setSearchQuery('')
      inputRef.current?.focus()
      return
    }

    if (filteredFiles.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < filteredFiles.length) {
        setSelectedFile(filteredFiles[focusedIndex])
      }
    }
  }, [filteredFiles, focusedIndex, setSelectedFile, searchQuery, setSearchQuery])

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  React.useEffect(() => {
    setFocusedIndex(-1)
  }, [searchQuery])

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col glass border-r border-white/10">
      {rootFolderPath && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-white/40 flex-shrink-0" />
            <p className="text-xs text-white/40 truncate">
              {rootFolderPath.split(/[/\\]/).pop()}
            </p>
          </div>
        </div>
      )}

      {rootFolderPath && files.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-7 py-1.5 rounded-md bg-white/5 border border-white/10 text-white/80 text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {filteredFiles.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-8 text-white/30">
            <Search size={24} className="mb-2" />
            <p className="text-sm">No files match your search</p>
          </div>
        ) : (
          filteredFiles.map((file, index) => (
            <FileItem
              key={file.path}
              file={file}
              isSelected={selectedFile?.path === file.path}
              isFocused={focusedIndex === index}
              onClick={() => {
                setSelectedFile(file)
                setFocusedIndex(index)
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}