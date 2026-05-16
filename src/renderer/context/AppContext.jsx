import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

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
    } else {
      setFileContent(null)
      setFileError(null)
    }
  }, [selectedFile, readFileContent])

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
    showToast
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