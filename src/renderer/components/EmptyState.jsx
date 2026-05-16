import React from 'react'
import { FolderOpen, FileText, AlignLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function EmptyState({ message, icon }) {
  const { rootFolderPath, files } = useApp()

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
        <IconComponent size={48} className="mx-auto mb-4 text-white/20" />
        <p className="text-white/40 text-lg">{showMessage}</p>
      </div>
    </div>
  )
}