import React from 'react'
import Sidebar from './Sidebar'
import PreviewPane from './PreviewPane'
import EmptyState from './EmptyState'
import { useApp } from '../context/AppContext'

export default function MainLayout() {
  const { files, selectedFile } = useApp()

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