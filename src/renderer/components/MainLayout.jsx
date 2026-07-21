import React from 'react'
import Sidebar from './Sidebar'
import PreviewPane from './PreviewPane'
import EmptyState from './EmptyState'
import { useFiles } from '../context/FilesContext'

export default function MainLayout() {
  const { files } = useFiles()

  if (files.length === 0) {
    return (
      <div className="flex-1 flex">
        <Sidebar />
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <Sidebar />
      <PreviewPane />
    </div>
  )
}
