import React, { useLayoutEffect, useRef, useState, useCallback } from 'react'
import HighlightToolbar from './HighlightToolbar'
import { useHighlights } from '../context/HighlightsContext'
import { useUI } from '../context/UIContext'

// Highlights are painted with the CSS Custom Highlight API (Chromium 105+,
// Electron 30 ships Chromium 124) instead of wrapping DOM nodes in <mark>
// elements. Ranges never touch React's DOM, so re-renders can't conflict
// with injected elements, and "re-applying" is just a cheap recompute.
const PREFIX_LEN = 24
const SUFFIX_LEN = 24
const HL_NAME = 'mdt-highlight'
const HL_SUPPORTED = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'

function generateId() {
  return 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      let p = node.parentNode
      while (p && p !== root) {
        const tag = p.nodeName
        if (tag === 'SCRIPT' || tag === 'STYLE') {
          return NodeFilter.FILTER_REJECT
        }
        p = p.parentNode
      }
      return NodeFilter.FILTER_ACCEPT
    }
  })
  const nodes = []
  let n
  while ((n = walker.nextNode())) nodes.push(n)
  return nodes
}

// Flattens the subtree into one string plus, per text node, its absolute
// [start, end) span in that string. All anchor math happens on these plain
// integer offsets — no fragile DOM range comparisons.
function buildTextIndex(root) {
  const textNodes = collectTextNodes(root)
  let fullText = ''
  const nodeRanges = []
  for (const n of textNodes) {
    const start = fullText.length
    fullText += n.nodeValue
    nodeRanges.push({ node: n, start, end: fullText.length })
  }
  return { fullText, nodeRanges }
}

function locateOffset(nodeRanges, abs) {
  for (const r of nodeRanges) {
    if (abs >= r.start && abs <= r.end) {
      return { node: r.node, offset: abs - r.start }
    }
  }
  return null
}

// Locates a stored highlight by its prefix+text+suffix anchor.
// Returns absolute { start, end } or null when the anchor is gone
// (e.g. the file was edited elsewhere).
function findAnchor(index, h) {
  const needle = h.prefix + h.text + h.suffix
  const idx = index.fullText.indexOf(needle)
  if (idx === -1) return null
  return { start: idx + h.prefix.length, end: idx + h.prefix.length + h.text.length }
}

function rangeToAbsolute(index, range) {
  const startNr = index.nodeRanges.find(r => r.node === range.startContainer)
  const endNr = index.nodeRanges.find(r => r.node === range.endContainer)
  if (!startNr || !endNr) return null
  return { start: startNr.start + range.startOffset, end: endNr.start + range.endOffset }
}

function getBlockAncestor(node, root) {
  let n = node
  while (n && n !== root) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const display = window.getComputedStyle(n).display
      if (display === 'block' || display === 'list-item' || display === 'flex' || display === 'grid' || display === 'table-row') {
        return n
      }
      const tag = n.nodeName
      if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'TR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE'].includes(tag)) {
        return n
      }
    }
    n = n.parentNode
  }
  return root
}


export default function HighlightableViewer({ filePath, scopeRef, children }) {
  const wrapperRef = useRef(null)
  const toolbarRef = useRef(null)
  const spansRef = useRef([])
  const { highlights, setHighlights, persistHighlights } = useHighlights()
  const { showToast } = useUI()
  const [toolbar, setToolbar] = useState(null)

  const fileHighlights = filePath ? (highlights[filePath] || []) : []

  const getRoot = useCallback(() => {
    return (scopeRef && scopeRef.current) || wrapperRef.current
  }, [scopeRef])

  // (Re)compute highlight ranges and hand them to the browser's highlight
  // registry. No DOM mutation: React stays the sole owner of the tree.
  useLayoutEffect(() => {
    spansRef.current = []
    if (!HL_SUPPORTED) return
    const root = getRoot()
    if (!root) return

    const registry = CSS.highlights
    registry.delete(HL_NAME)

    const index = buildTextIndex(root)
    const ranges = []
    const spans = []
    for (const h of fileHighlights) {
      const abs = findAnchor(index, h)
      if (!abs) continue // anchor lost (content changed) — keep it stored, just don't paint
      const s = locateOffset(index.nodeRanges, abs.start)
      const e = locateOffset(index.nodeRanges, abs.end)
      if (!s || !e) continue
      const range = document.createRange()
      try {
        range.setStart(s.node, s.offset)
        range.setEnd(e.node, e.offset)
      } catch (err) {
        continue
      }
      ranges.push(range)
      spans.push({ id: h.id, range })
    }
    if (ranges.length > 0) {
      registry.set(HL_NAME, new Highlight(...ranges))
    }
    spansRef.current = spans

    return () => registry.delete(HL_NAME)
  }, [children, fileHighlights, getRoot])

  // Hit-tests a viewport point against the active highlight ranges.
  const hitTest = useCallback((x, y) => {
    const spans = spansRef.current
    if (!spans || spans.length === 0 || !document.caretRangeFromPoint) return null
    const point = document.caretRangeFromPoint(x, y)
    if (!point) return null
    for (const span of spans) {
      try {
        if (span.range.isPointInRange(point.startContainer, point.startOffset)) {
          return span
        }
      } catch (err) {
        // stale range (content changed under us) — ignore
      }
    }
    return null
  }, [])

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      if (!wrapperRef.current) return
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      const range = selection.getRangeAt(0)
      const rawText = selection.toString()

      if (!rawText.trim()) return
      if (!wrapperRef.current.contains(range.commonAncestorContainer)) return

      const root = getRoot()
      const index = buildTextIndex(root)
      const selAbs = rangeToAbsolute(index, range)
      if (!selAbs) return

      // Trim the selection in flat-text space so prefix/text/suffix always
      // match what findAnchor will look for later.
      const leadWs = rawText.length - rawText.trimStart().length
      const trailWs = rawText.length - rawText.trimEnd().length
      selAbs.start += leadWs
      selAbs.end -= trailWs
      if (selAbs.end <= selAbs.start) return

      const startBlock = getBlockAncestor(range.startContainer, wrapperRef.current)
      const endBlock = getBlockAncestor(range.endContainer, wrapperRef.current)
      if (startBlock !== endBlock) {
        showToast('Select text within a single block')
        return
      }

      // Overlapping an existing highlight → let the click handler offer
      // removal instead of stacking a new highlight on top.
      for (const h of fileHighlights) {
        const abs = findAnchor(index, h)
        if (abs && selAbs.start < abs.end && abs.start < selAbs.end) return
      }

      const text = index.fullText.slice(selAbs.start, selAbs.end)
      const prefix = index.fullText.slice(Math.max(0, selAbs.start - PREFIX_LEN), selAbs.start)
      const suffix = index.fullText.slice(selAbs.end, selAbs.end + SUFFIX_LEN)

      const rect = range.getBoundingClientRect()
      setToolbar({
        mode: 'add',
        x: rect.left + rect.width / 2,
        y: rect.top,
        text,
        prefix,
        suffix
      })
    }, 10)
  }, [showToast, getRoot, fileHighlights])

  const handleClick = useCallback((e) => {
    const span = hitTest(e.clientX, e.clientY)
    if (span) {
      const rect = span.range.getBoundingClientRect()
      setToolbar({
        mode: 'remove',
        x: rect.left + rect.width / 2,
        y: rect.top,
        id: span.id
      })
    }
  }, [hitTest])

  React.useEffect(() => {
    if (!toolbar) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setToolbar(null)
        window.getSelection()?.removeAllRanges()
      }
    }
    const handleMouseDown = (e) => {
      const t = e.target
      if (toolbarRef.current && toolbarRef.current.contains(t)) return
      if (hitTest(e.clientX, e.clientY)) return
      setToolbar(null)
    }
    window.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [toolbar, hitTest])

  const handleAdd = useCallback(() => {
    if (!toolbar || toolbar.mode !== 'add' || !filePath) return
    const newHighlight = {
      id: generateId(),
      prefix: toolbar.prefix,
      text: toolbar.text,
      suffix: toolbar.suffix,
      createdAt: Date.now()
    }
    const current = highlights[filePath] || []
    const next = [...current, newHighlight]
    setHighlights(prev => ({ ...prev, [filePath]: next }))
    persistHighlights(filePath, next)
    setToolbar(null)
    window.getSelection()?.removeAllRanges()
  }, [toolbar, filePath, highlights, setHighlights, persistHighlights])

  const handleRemove = useCallback(() => {
    if (!toolbar || toolbar.mode !== 'remove' || !filePath) return
    const current = highlights[filePath] || []
    const next = current.filter(h => h.id !== toolbar.id)
    setHighlights(prev => ({ ...prev, [filePath]: next }))
    persistHighlights(filePath, next)
    setToolbar(null)
  }, [toolbar, filePath, highlights, setHighlights, persistHighlights])

  return (
    <div
      ref={wrapperRef}
      className="mdt-highlight-wrapper"
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {children}
      {toolbar && (
        <div ref={toolbarRef} className="mdt-highlight-toolbar-wrapper">
          <HighlightToolbar
            mode={toolbar.mode}
            x={toolbar.x}
            y={toolbar.y}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        </div>
      )}
    </div>
  )
}
