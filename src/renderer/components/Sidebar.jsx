import React, { useState, useCallback, useMemo, useRef } from 'react'
import { FolderOpen, Search, X, ChevronDown, ChevronUp, Moon, Sun, BookOpen, Library as LibraryIcon, X as XIcon } from 'lucide-react'
import FileItem from './FileItem'
import { useApp } from '../context/AppContext'
import { version } from '../../../package.json'

function ThemeToggle() {
  const [current, setCurrent] = useState(() => {
    if (typeof document === 'undefined') return 'dark'
    return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark'
  })

  React.useEffect(() => {
    const handler = (e) => {
      if (e.detail === 'light' || e.detail === 'dark') {
        setCurrent(e.detail)
      }
    }
    window.addEventListener('mdtxt:theme-change', handler)
    return () => window.removeEventListener('mdtxt:theme-change', handler)
  }, [])

  const isLight = current === 'light'

  const toggle = () => {
    const next = isLight ? 'dark' : 'light'
    window.dispatchEvent(new CustomEvent('mdtxt:theme-change', { detail: next }))
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-between w-full px-2.5 py-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-accent-soft transition-all duration-150 group"
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <div className="flex items-center gap-2">
        {isLight ? <Sun size={14} /> : <Moon size={14} />}
        <span className="text-sm">{isLight ? 'Light Mode' : 'Dark Mode'}</span>
      </div>
      <div
        className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${isLight ? 'bg-accent' : 'bg-border-strong'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-soft transition-transform duration-200 ${isLight ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </div>
    </button>
  )
}

function LibrarySection({ recentFolders, onSelect, onClear }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!recentFolders || recentFolders.length === 0) return null

  const handleClear = (e) => {
    e.stopPropagation()
    onClear()
  }

  return (
    <div className="px-3 pt-3 pb-2 border-b border-border-subtle">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between w-full px-1 py-1 text-text-muted hover:text-text-secondary transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <LibraryIcon size={11} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Library</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!collapsed && (
            <span
              onClick={handleClear}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClear(e) } }}
              className="text-text-muted hover:text-accent transition-colors p-0.5 rounded"
              title="Clear library"
            >
              <XIcon size={11} />
            </span>
          )}
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </div>
      </button>
      {!collapsed && (
        <div className="mt-1.5 space-y-0.5">
          {recentFolders.map((folderPath) => {
            const folderName = folderPath.split(/[/\\]/).pop() || folderPath
            return (
              <button
                key={folderPath}
                onClick={() => onSelect(folderPath)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-accent-soft text-left text-sm transition-all duration-150"
                title={folderPath}
              >
                <BookOpen size={12} className="text-accent flex-shrink-0" />
                <span className="truncate">{folderName}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const {
    rootFolderPath,
    files,
    selectedFile,
    setSelectedFile,
    searchQuery,
    setSearchQuery,
    recentFolders,
    setRootFolderPath,
    clearRecentFolders
  } = useApp()
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef(null)

  const handleChooseFolder = async () => {
    const result = await window.electronAPI.chooseFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      setRootFolderPath(result.filePaths[0])
    }
  }

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
    <div className="w-[280px] flex-shrink-0 flex flex-col bg-bg-sidebar border-r border-border-subtle transition-colors duration-200">
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={handleChooseFolder}
          style={{
            backgroundColor: '#676386',
            color: '#ffffff'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#565477' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#676386' }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 shadow-soft"
        >
          <FolderOpen size={15} />
          <span>Choose Folder</span>
        </button>
      </div>

      <LibrarySection
        recentFolders={recentFolders}
        onSelect={(p) => setRootFolderPath(p)}
        onClear={clearRecentFolders}
      />

      {rootFolderPath && (
        <div className="px-4 py-2 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen size={12} className="text-accent flex-shrink-0" />
            <p className="text-sm text-text-secondary truncate">
              {rootFolderPath.split(/[/\\]/).pop()}
            </p>
          </div>
        </div>
      )}

      {rootFolderPath && files.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-8 pr-7 py-1.5 rounded-md bg-bg-surface border border-border-subtle text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {filteredFiles.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <Search size={22} className="mb-2 opacity-60" />
            <p className="text-sm">No files match</p>
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

      <div className="border-t border-border-subtle px-2 py-2">
        <ThemeToggle />
        <p className="text-center text-[11px] text-text-muted mt-1.5 select-none">v{version}</p>
      </div>
    </div>
  )
}
