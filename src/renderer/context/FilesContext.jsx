import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useUI } from './UIContext'
import { useHighlights } from './HighlightsContext'

const FilesContext = createContext(null)

export function FilesProvider({ children }) {
  const { showToast } = useUI()
  const { loadHighlightsForFile, resetHighlights } = useHighlights()
  const [rootFolderPath, setRootFolderPath] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [recentFolders, setRecentFolders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const pendingFileRef = useRef(null)

  useEffect(() => {
    window.electronAPI.getRecentFolders().then(setRecentFolders)
  }, [])

  const scanFolder = useCallback(async (folderPath) => {
    const result = await window.electronAPI.scanFolder(folderPath)
    if (result.error) {
      showToast('Could not read folder', 'error')
      setFiles([])
      return
    }
    setFiles(result.files)
    const updatedRecents = await window.electronAPI.addRecentFolder(folderPath)
    setRecentFolders(updatedRecents)
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

  const openFolderViaDialog = useCallback(async () => {
    const result = await window.electronAPI.chooseFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      setRootFolderPath(result.filePaths[0])
    }
  }, [])

  const clearRecentFolders = useCallback(async () => {
    const updated = await window.electronAPI.clearRecentFolders()
    setRecentFolders(Array.isArray(updated) ? updated : [])
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
    setSearchQuery('')
    resetHighlights()
  }, [rootFolderPath, scanFolder, resetHighlights])

  // After a file is dropped on the window, select it once its parent folder
  // has been scanned.
  useEffect(() => {
    if (pendingFileRef.current && files.length > 0) {
      const target = files.find(f => f.path === pendingFileRef.current)
      if (target) setSelectedFile(target)
      pendingFileRef.current = null
    }
  }, [files])

  useEffect(() => {
    if (selectedFile) {
      readFileContent(selectedFile)
      loadHighlightsForFile(selectedFile.path)
    } else {
      setFileContent(null)
      setFileError(null)
    }
  }, [selectedFile, readFileContent, loadHighlightsForFile])

  const value = {
    rootFolderPath,
    setRootFolderPath,
    files,
    selectedFile,
    setSelectedFile,
    fileContent,
    fileError,
    recentFolders,
    searchQuery,
    setSearchQuery,
    openFolderViaDialog,
    clearRecentFolders,
    pendingFileRef
  }

  return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
}

export function useFiles() {
  const context = useContext(FilesContext)
  if (!context) {
    throw new Error('useFiles must be used within FilesProvider')
  }
  return context
}
