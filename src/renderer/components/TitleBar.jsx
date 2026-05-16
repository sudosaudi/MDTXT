import React from 'react'
import { ZoomIn, ZoomOut, FolderOpen, Minus, Square, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function TitleBar() {
  const { zoomLevel, setZoomLevel, setRootFolderPath, rootFolderPath } = useApp()

  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 10, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 10, 60))
  }

  const handleChooseFolder = async () => {
    const result = await window.electronAPI.chooseFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      setRootFolderPath(result.filePaths[0])
    }
  }

  return (
    <div
      className="h-8 flex items-center justify-between px-4 glass drag-region border-b border-white/10"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white/80">MD-TXT Browser</span>
        {rootFolderPath && (
          <span className="text-xs text-white/40 truncate max-w-[200px]">
            {rootFolderPath}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          onClick={handleChooseFolder}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all duration-150"
          title="Choose Folder"
        >
          <FolderOpen size={14} />
          <span>Choose Folder</span>
        </button>

        <div className="w-px h-4 bg-white/20 mx-2" />

        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-150"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <span className="text-xs text-white/60 w-12 text-center font-mono">
          {zoomLevel}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-150"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>

        <div className="w-px h-4 bg-white/20 mx-2" />

        <button
          onClick={() => window.electronAPI.minimize()}
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150"
          title="Minimize"
        >
          <Minus size={16} />
        </button>

        <button
          onClick={() => window.electronAPI.maximize()}
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150"
          title="Maximize"
        >
          <Square size={14} />
        </button>

        <button
          onClick={() => window.electronAPI.close()}
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-red-500/80 transition-all duration-150"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}