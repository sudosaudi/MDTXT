import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [rootFolderPath, setRootFolderPath] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [toastMessage, setToastMessage] = useState(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [highlights, setHighlights] = useState({})
  const [recentFolders, setRecentFolders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const saveTimersRef = useRef({})
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    const savedZoom = localStorage.getItem('md-browser-zoom')
    if (savedZoom) {
      try {
        const parsed = parseInt(savedZoom, 10)
        if (!isNaN(parsed) && parsed >= 60 && parsed <= 200) {
          setZoomLevel(parsed)
        }
      } catch (e) {
        // silently fall back to 100
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('md-browser-zoom', zoomLevel.toString())
  }, [zoomLevel])

  useEffect(() => {
    window.electronAPI.getRecentFolders().then(setRecentFolders)
  }, [])

  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    window.electronAPI.getLastOpenedFolder().then((folder) => {
      if (folder) {
        setRootFolderPath(folder)
        const folderName = folder.split(/[/\\]/).pop() || folder
        showToast(`Restored: ${folderName}`)
      }
    })
  }, [showToast])

  const showToast = useCallback((message) => {
    setToastMessage(message)
    setToastVisible(true)
    setTimeout(() => {
      setToastVisible(false)
      setTimeout(() => setToastMessage(null), 300)
    }, 3000)
  }, [])

  const scanFolder = useCallback(async (folderPath) => {
    const result = await window.electronAPI.scanFolder(folderPath)
    if (result.error) {
      showToast('Could not read folder')
      setFiles([])
      return
    }
    setFiles(result.files)
    const updatedRecents = await window.electronAPI.addRecentFolder(folderPath)
    setRecentFolders(updatedRecents)
    await window.electronAPI.setLastOpenedFolder(folderPath)
  }, [showToast])

  const readFileContent = useCallback(async (file) => {
    const result = await window.electronAPI.readFile(file.path)
    if (result.error) {
      setFileError('Could not load this file')
      setFileContent(null)
    } else {
      setFileContent(result.content)
      setFileError(null)
    }
  }, [])

  const loadHighlightsForFile = useCallback(async (filePath) => {
    try {
      const list = await window.electronAPI.loadHighlights(filePath)
      setHighlights(prev => ({ ...prev, [filePath]: Array.isArray(list) ? list : [] }))
    } catch (e) {
      setHighlights(prev => ({ ...prev, [filePath]: [] }))
    }
  }, [])

  const persistHighlights = useCallback((filePath, list) => {
    if (!filePath) return
    if (saveTimersRef.current[filePath]) {
      clearTimeout(saveTimersRef.current[filePath])
    }
    saveTimersRef.current[filePath] = setTimeout(() => {
      window.electronAPI.saveHighlights(filePath, list)
    }, 300)
  }, [])

  useEffect(() => {
    if (rootFolderPath) {
      scanFolder(rootFolderPath)
    } else {
      setFiles([])
    }
    setSelectedFile(null)
    setFileContent(null)
    setFileError(null)
  }, [rootFolderPath, scanFolder])

  useEffect(() => {
    if (selectedFile) {
      readFileContent(selectedFile)
      loadHighlightsForFile(selectedFile.path)
    } else {
      setFileContent(null)
      setFileError(null)
    }
  }, [selectedFile, readFileContent, loadHighlightsForFile])

  useEffect(() => {
    setSearchQuery('')
  }, [rootFolderPath])

  const value = {
    rootFolderPath,
    setRootFolderPath,
    files,
    selectedFile,
    setSelectedFile,
    fileContent,
    fileError,
    zoomLevel,
    setZoomLevel,
    toastMessage,
    toastVisible,
    showToast,
    highlights,
    setHighlights,
    persistHighlights,
    recentFolders,
    searchQuery,
    setSearchQuery
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}