import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const UIContext = createContext(null)

const ZOOM_KEY = 'md-browser-zoom'
const THEME_KEY = 'mdtxt-theme'

function resolveSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

// localStorage is read synchronously at first render so returning users get
// no theme flash; the main-process store is reconciled afterwards.
function readInitialTheme() {
  try {
    const cached = localStorage.getItem(THEME_KEY)
    if (cached === 'light' || cached === 'dark') return { theme: cached, override: true }
  } catch (e) {}
  return { theme: resolveSystemTheme(), override: false }
}

function applyThemeClass(resolved) {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')
  root.classList.add(resolved === 'light' ? 'theme-light' : 'theme-dark')
}

export function UIProvider({ children }) {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [toastMessage, setToastMessage] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [toastVisible, setToastVisible] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const initialTheme = useRef(readInitialTheme())
  const [theme, setThemeState] = useState(initialTheme.current.theme)
  const userOverrideRef = useRef(initialTheme.current.override)
  const toastTimersRef = useRef([])

  useEffect(() => { applyThemeClass(theme) }, [theme])

  // Reconcile with the persisted store on boot (authoritative across devices
  // where localStorage may have been cleared).
  useEffect(() => {
    let mounted = true
    window.electronAPI.getTheme().then((saved) => {
      if (!mounted) return
      if (saved === 'light' || saved === 'dark') {
        userOverrideRef.current = true
        setThemeState(saved)
        try { localStorage.setItem(THEME_KEY, saved) } catch (e) {}
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // Track the OS theme only while the user hasn't chosen one explicitly.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onSystemChange = (e) => {
      if (userOverrideRef.current) return
      setThemeState(e.matches ? 'light' : 'dark')
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  const setTheme = useCallback((next) => {
    if (next !== 'light' && next !== 'dark') return
    userOverrideRef.current = true
    setThemeState(next)
    try { localStorage.setItem(THEME_KEY, next) } catch (e) {}
    window.electronAPI.setTheme(next).catch(() => {})
  }, [])

  useEffect(() => {
    const savedZoom = localStorage.getItem(ZOOM_KEY)
    if (savedZoom) {
      const parsed = parseInt(savedZoom, 10)
      if (!isNaN(parsed) && parsed >= 60 && parsed <= 200) setZoomLevel(parsed)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(ZOOM_KEY, String(zoomLevel))
  }, [zoomLevel])

  const showToast = useCallback((message, type = 'info') => {
    // Reset the hide timers so rapid successive toasts don't get cut off.
    toastTimersRef.current.forEach(clearTimeout)
    toastTimersRef.current = [
      setTimeout(() => setToastVisible(false), 3000),
      setTimeout(() => setToastMessage(null), 3300)
    ]
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }, [])

  useEffect(() => () => toastTimersRef.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onUpdateAvailable) return
    const unsubscribe = window.electronAPI.onUpdateAvailable((data) => {
      if (data.type === 'downloaded') {
        setUpdateInfo(data)
        setUpdateDownloaded(true)
      } else if (data.type === 'available') {
        setUpdateInfo(data)
        setUpdateDownloaded(false)
      } else if (data.type === 'error') {
        showToast('Update failed: ' + (data.message || 'unknown error'), 'error')
      }
    })
    return unsubscribe
  }, [showToast])

  const handleInstallUpdate = useCallback(() => {
    if (!updateDownloaded) {
      showToast('Update still downloading…')
      return
    }
    if (window.electronAPI && window.electronAPI.installUpdate) {
      window.electronAPI.installUpdate()
    }
  }, [updateDownloaded, showToast])

  const exportPdf = useCallback(async (file) => {
    if (!file) return
    showToast('Exporting PDF...')
    const result = await window.electronAPI.exportPdf(file.path)
    if (result.ok) {
      const name = result.path.split(/[/\\]/).pop()
      showToast(`Exported ${name}`, 'success')
    } else if (result.error !== 'canceled') {
      showToast(result.error || 'Export failed', 'error')
    }
  }, [showToast])

  const value = {
    zoomLevel,
    setZoomLevel,
    toastMessage,
    toastType,
    toastVisible,
    showToast,
    theme,
    setTheme,
    updateInfo,
    updateDownloaded,
    handleInstallUpdate,
    exportPdf
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within UIProvider')
  }
  return context
}
