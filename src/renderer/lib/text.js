// Text utilities for the preview status bar.

// Strips Markdown syntax so the word count reflects the rendered prose,
// not the markup. Code fences, inline code, images, link URLs, HTML tags,
// heading/quote/list markers and emphasis characters are removed; link text
// is kept.
export function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/~~~[\s\S]*?(~~~|$)/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-+*]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')
    .replace(/[*_~]/g, '')
}

export function getWordCount(text, extension) {
  if (!text) return 0
  const source = extension === '.md' ? stripMarkdown(text) : text
  const trimmed = source.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

// Estimated reading time in minutes at ~200 wpm. Always at least 1 for
// non-empty documents.
export function getReadTimeMinutes(wordCount) {
  if (!wordCount || wordCount <= 0) return 0
  return Math.max(1, Math.round(wordCount / 200))
}
