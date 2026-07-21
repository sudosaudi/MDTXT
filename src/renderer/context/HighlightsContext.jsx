import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const HighlightsContext = createContext(null)

export function HighlightsProvider({ children }) {
  const [highlights, setHighlights] = useState({})
  const saveTimersRef = useRef({})

  const loadHighlightsForFile = useCallback(async (filePath) => {
    try {
      const list = await window.electronAPI.loadHighlights(filePath)
      setHighlights(prev => ({ ...prev, [filePath]: Array.isArray(list) ? list : [] }))
    } catch (e) {
      setHighlights(prev => ({ ...prev, [filePath]: [] }))
    }
  }, [])

  // Debounced per file so rapid add/remove bursts collapse into one write.
  const persistHighlights = useCallback((filePath, list) => {
    if (!filePath) return
    if (saveTimersRef.current[filePath]) {
      clearTimeout(saveTimersRef.current[filePath])
    }
    saveTimersRef.current[filePath] = setTimeout(() => {
      window.electronAPI.saveHighlights(filePath, list)
    }, 300)
  }, [])

  // Drop all in-memory highlights (e.g. when switching folders) so state
  // doesn't accumulate for every file ever opened in the session.
  const resetHighlights = useCallback(() => setHighlights({}), [])

  const value = {
    highlights,
    setHighlights,
    loadHighlightsForFile,
    persistHighlights,
    resetHighlights
  }

  return <HighlightsContext.Provider value={value}>{children}</HighlightsContext.Provider>
}

export function useHighlights() {
  const context = useContext(HighlightsContext)
  if (!context) {
    throw new Error('useHighlights must be used within HighlightsProvider')
  }
  return context
}
