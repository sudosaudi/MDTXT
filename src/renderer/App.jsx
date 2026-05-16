import React from 'react'
import { AppProvider } from './context/AppContext'
import TitleBar from './components/TitleBar'
import MainLayout from './components/MainLayout'
import Toast from './components/Toast'

export default function App() {
  return (
    <AppProvider>
      <div className="h-screen w-screen flex flex-col bg-[#0f0f12] overflow-hidden">
        <TitleBar />
        <MainLayout />
        <Toast />
      </div>
    </AppProvider>
  )
}