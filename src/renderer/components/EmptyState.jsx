import React from 'react'
import { FolderOpen, FileText, AlignLeft, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function EmptyState({ message, icon }) {
  const { rootFolderPath, files, recentFolders, setRootFolderPath } = useApp()

  const handleChooseFolder = async () => {
    const result = await window.electronAPI.chooseFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      setRootFolderPath(result.filePaths[0])
    }
  }

  let showMessage = message
  let IconComponent = FolderOpen

  if (!rootFolderPath) {
    showMessage = 'Select a folder to browse files'
    IconComponent = FolderOpen
  } else if (files.length === 0) {
    showMessage = 'No supported files found in this folder'
    IconComponent = FileText
  } else if (icon === 'file') {
    showMessage = message || 'Select a file to preview'
    IconComponent = AlignLeft
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        {!rootFolderPath ? (
          <>
            <IconComponent size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white/40 text-lg mb-6">{showMessage}</p>
            <button
              onClick={handleChooseFolder}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/30 text-base font-medium transition-all duration-200"
            >
              <FolderOpen size={20} />
              <span>Open a Folder</span>
            </button>
            {recentFolders.length > 0 && (
              <div className="mt-10 w-80 mx-auto">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock size={14} className="text-white/30" />
                  <span className="text-white/30 text-sm uppercase tracking-wider">Recent Folders</span>
                </div>
                <div className="space-y-1">
                  {recentFolders.map((folderPath) => {
                    const folderName = folderPath.split(/[/\\]/).pop() || folderPath
                    return (
                      <button
                        key={folderPath}
                        onClick={() => setRootFolderPath(folderPath)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-left text-sm transition-all duration-150 border border-transparent hover:border-white/10"
                        title={folderPath}
                      >
                        <FolderOpen size={14} className="text-amber-500/70 flex-shrink-0" />
                        <span className="truncate">{folderName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <IconComponent size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white/40 text-lg">{showMessage}</p>
          </>
        )}
      </div>
    </div>
  )
}