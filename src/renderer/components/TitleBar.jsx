import React from 'react'
import { Plus, Minus, Square, X, FileDown } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function TitleBar() {
  const { zoomLevel, setZoomLevel, rootFolderPath, selectedFile, exportPdf } = useApp()

  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 10, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 10, 60))
  }

  return (
    <div
      className="h-8 flex items-center justify-between px-4 glass drag-region border-b border-border-subtle"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          MDTXT
        </span>
        {rootFolderPath && (
          <span className="text-sm text-text-secondary truncate">
            {rootFolderPath.split(/[/\\]/).pop()}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1 flex-shrink-0"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-accent-soft transition-all duration-150"
          title="Smaller font"
        >
          <Minus size={16} />
        </button>

        <span className="text-xs text-text-muted w-11 text-center tracking-wider font-normal select-none">
          {zoomLevel}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-accent-soft transition-all duration-150"
          title="Larger font"
        >
          <Plus size={16} />
        </button>

        {selectedFile && (
          <>
            <div className="w-px h-4 bg-border-strong mx-2" />
            <button
              onClick={() => exportPdf(selectedFile)}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-accent-soft transition-all duration-150"
              title="Export PDF"
            >
              <FileDown size={16} />
            </button>
          </>
        )}

        <div className="w-px h-4 bg-border-strong mx-2" />

        <button
          onClick={() => window.electronAPI.minimize()}
          className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-accent-soft transition-all duration-150"
          title="Minimize"
        >
          <Minus size={16} />
        </button>

        <button
          onClick={() => window.electronAPI.maximize()}
          className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-accent-soft transition-all duration-150"
          title="Maximize"
        >
          <Square size={14} />
        </button>

        <button
          onClick={() => window.electronAPI.close()}
          className="p-1.5 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all duration-150"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
