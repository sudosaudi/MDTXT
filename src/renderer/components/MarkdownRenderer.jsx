import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check } from 'lucide-react'
import { useUI } from '../context/UIContext'
import { useFiles } from '../context/FilesContext'
import HighlightableViewer from './HighlightableViewer'

// Recursively extracts plain text from rendered children. After
// rehype-highlight runs, code content is a tree of <span> elements, so the
// old String(children) approach silently copied "[object Object]".
function extractText(node) {
  if (node == null || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement(node)) return extractText(node.props.children)
  return ''
}

// react-markdown v9 no longer passes an `inline` prop to `code`. The v9
// pattern: override `pre` for block rendering (wrapper, language label, copy
// button) and leave `code` at its default — inline code is styled via CSS
// (`.mdt-prose code:not(pre code)`).
function CustomPre({ children }) {
  const [copied, setCopied] = useState(false)

  const codeEl = React.Children.toArray(children).find(React.isValidElement)
  const className = (codeEl && codeEl.props && codeEl.props.className) || ''
  const match = /language-(\w+)/.exec(className)
  const language = match ? match[1] : ''
  const codeString = extractText(codeEl ? codeEl.props.children : children).replace(/\n$/, '')

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group mb-4">
      {language && (
        <div className="absolute top-0 right-2 text-[10px] text-text-muted bg-bg-sidebar px-2 py-1 rounded-b-md font-mono uppercase tracking-wider">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-bg-sidebar hover:bg-border-strong text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all duration-150"
        title="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre
        className="bg-bg-code rounded-lg p-4 overflow-x-auto border border-border-subtle"
        style={{ boxShadow: 'var(--code-block-shadow)' }}
      >
        {children}
      </pre>
    </div>
  )
}

function CustomImage({ src, alt }) {
  const { selectedFile } = useFiles()

  let imageSrc = src

  if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('local-files://')) {
    if (selectedFile) {
      const lastSlash = Math.max(
        selectedFile.path.lastIndexOf('/'),
        selectedFile.path.lastIndexOf('\\')
      )
      const fileDir = lastSlash > 0 ? selectedFile.path.substring(0, lastSlash) : ''
      const sep = selectedFile.path.includes('\\') ? '\\' : '/'
      const absolutePath = fileDir + sep + src
      imageSrc = 'local-files://' + encodeURIComponent(absolutePath)
    }
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="max-w-full rounded-lg my-4 border border-border-subtle"
      style={{ maxHeight: '400px' }}
    />
  )
}

export default function MarkdownRenderer({ content }) {
  const { zoomLevel, theme } = useUI()
  const { selectedFile } = useFiles()
  const isDark = theme !== 'light'

  return (
    <HighlightableViewer filePath={selectedFile?.path}>
      <div
        className={`mdt-prose max-w-none p-8 ${isDark ? 'prose prose-invert' : 'prose'}`}
        style={{ fontSize: zoomLevel + '%' }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            pre: CustomPre,
            img: CustomImage
          }}
        >
          {content || ''}
        </ReactMarkdown>
      </div>
    </HighlightableViewer>
  )
}
