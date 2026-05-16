import React, { useState, useCallback } from 'react'
import { FolderOpen } from 'lucide-react'
import FileItem from './FileItem'
import { useApp } from '../context/AppContext'

export default function Sidebar() {
  const { rootFolderPath, setRootFolderPath, files, selectedFile, setSelectedFile } = useApp()
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const handleChooseFolder = async () => {
    const result = await window.electronAPI.chooseFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      setRootFolderPath(result.filePaths[0])
    }
  }

  const handleKeyDown = useCallback((e) => {
    if (files.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.min(prev + 1, files.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < files.length) {
        setSelectedFile(files[focusedIndex])
      }
    }
  }, [files, focusedIndex, setSelectedFile])

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col glass border-r border-white/10">
      <div className="p-3 border-b border-white/10">
        <button
          onClick={handleChooseFolder}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all duration-150 border border-white/10 hover:border-white/20"
        >
          <FolderOpen size={16} />
          <span>Choose Folder</span>
        </button>
        {rootFolderPath && (
          <p className="mt-2 text-xs text-white/40 truncate text-center">
            {rootFolderPath}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {files.map((file, index) => (
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
        ))}
      </div>
    </div>
  )
}