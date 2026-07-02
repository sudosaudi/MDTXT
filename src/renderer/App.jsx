import React, { useEffect, useState } from 'react'
import { AppProvider } from './context/AppContext'
import TitleBar from './components/TitleBar'
import MainLayout from './components/MainLayout'
import Toast from './components/Toast'
import DropZone from './components/DropZone'

function resolveInitialTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function App() {
  const [theme, setTheme] = useState(null)

  useEffect(() => {
    let mounted = true
    let userOverride = null

    const apply = (resolved) => {
      const root = document.documentElement
      root.classList.remove('theme-light', 'theme-dark')
      root.classList.add(resolved === 'light' ? 'theme-light' : 'theme-dark')
    }

    window.electronAPI.getTheme().then((saved) => {
      if (!mounted) return
      userOverride = saved
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved)
        apply(saved)
      } else {
        const resolved = resolveInitialTheme()
        setTheme(resolved)
        apply(resolved)
      }
    }).catch(() => {
      const resolved = resolveInitialTheme()
      setTheme(resolved)
      apply(resolved)
    })

    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onSystemChange = (e) => {
      if (userOverride) return
      const resolved = e.matches ? 'light' : 'dark'
      setTheme(resolved)
      apply(resolved)
    }
    mq.addEventListener('change', onSystemChange)

    const onThemeChange = (e) => {
      const next = e.detail
      if (next !== 'light' && next !== 'dark') return
      userOverride = next
      setTheme(next)
      apply(next)
    }
    window.addEventListener('mdtxt:theme-change', onThemeChange)

    return () => {
      mounted = false
      mq.removeEventListener('change', onSystemChange)
      window.removeEventListener('mdtxt:theme-change', onThemeChange)
    }
  }, [])

  return (
    <AppProvider>
      <DropZone>
        <div className="h-screen w-screen flex flex-col bg-bg-primary text-text-primary overflow-hidden transition-colors duration-200">
          <TitleBar />
          <MainLayout />
          <Toast />
        </div>
      </DropZone>
    </AppProvider>
  )
}
