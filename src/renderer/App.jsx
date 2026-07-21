import React from 'react'
import { UIProvider } from './context/UIContext'
import { HighlightsProvider } from './context/HighlightsContext'
import { FilesProvider } from './context/FilesContext'
import TitleBar from './components/TitleBar'
import MainLayout from './components/MainLayout'
import Toast from './components/Toast'
import DropZone from './components/DropZone'

export default function App() {
  return (
    <UIProvider>
      <HighlightsProvider>
        <FilesProvider>
          <DropZone>
            <div className="h-screen w-screen flex flex-col bg-bg-primary text-text-primary overflow-hidden transition-colors duration-200">
              <TitleBar />
              <MainLayout />
              <Toast />
            </div>
          </DropZone>
        </FilesProvider>
      </HighlightsProvider>
    </UIProvider>
  )
}
