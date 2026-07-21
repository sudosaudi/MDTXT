// Pure helper functions for the main process.
// ESM so electron-vite bundles this file into out/main/index.js (CJS
// require() calls are left as runtime requires and would not resolve).
// Also unit-tested with vitest (see test/main-utils.test.js).

import path from 'path'

export function sanitizeErrorMessage(err) {
  if (!err || typeof err.message !== 'string') return 'operation failed'
  // Strip control characters (0-31 and 127) without regex escapes.
  const clean = err.message
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
  return clean.slice(0, 200)
}

// Lexical containment check. Note: does not resolve symlinks — callers that
// need symlink-safe checks should pass paths through fs.realpathSync first.
export function isPathInsideRoot(targetPath, rootPath) {
  if (!rootPath || !targetPath) return false
  const resolvedRoot = path.resolve(rootPath)
  const resolvedTarget = path.resolve(targetPath)
  if (resolvedTarget === resolvedRoot) return true
  const rel = path.relative(resolvedRoot, resolvedTarget)
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel)
}

export function hasAllowedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.md' || ext === '.txt'
}

export function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'].includes(ext)
}
