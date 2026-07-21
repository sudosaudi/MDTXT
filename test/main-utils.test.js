import { describe, it, expect } from 'vitest'
import path from 'path'
import { sanitizeErrorMessage, isPathInsideRoot, hasAllowedExtension, isImageFile } from '../src/main/utils.js'

describe('isPathInsideRoot', () => {
  const root = path.resolve('/home/user/notes')

  it('accepts the root itself', () => {
    expect(isPathInsideRoot(root, root)).toBe(true)
  })

  it('accepts nested children', () => {
    expect(isPathInsideRoot(path.join(root, 'sub', 'file.md'), root)).toBe(true)
  })

  it('rejects parent traversal', () => {
    expect(isPathInsideRoot(path.join(root, '..', 'secret.md'), root)).toBe(false)
  })

  it('rejects sibling directories that share a name prefix', () => {
    expect(isPathInsideRoot('/home/user/notes-evil/x.md', root)).toBe(false)
  })

  it('rejects absolute paths outside the root', () => {
    expect(isPathInsideRoot('/etc/passwd', root)).toBe(false)
  })

  it('rejects empty inputs', () => {
    expect(isPathInsideRoot('', root)).toBe(false)
    expect(isPathInsideRoot('/a/b.md', null)).toBe(false)
  })
})

describe('hasAllowedExtension', () => {
  it('allows .md and .txt (case-insensitive)', () => {
    expect(hasAllowedExtension('a.md')).toBe(true)
    expect(hasAllowedExtension('b.TXT')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(hasAllowedExtension('a.exe')).toBe(false)
    expect(hasAllowedExtension('a.md.png')).toBe(false)
    expect(hasAllowedExtension('noext')).toBe(false)
  })
})

describe('isImageFile', () => {
  it('accepts common image types', () => {
    expect(isImageFile('x.png')).toBe(true)
    expect(isImageFile('x.JPG')).toBe(true)
    expect(isImageFile('x.svg')).toBe(true)
  })

  it('rejects non-images', () => {
    expect(isImageFile('x.md')).toBe(false)
    expect(isImageFile('id_rsa')).toBe(false)
  })
})

describe('sanitizeErrorMessage', () => {
  it('returns a fallback for non-Error input', () => {
    expect(sanitizeErrorMessage(null)).toBe('operation failed')
    expect(sanitizeErrorMessage({})).toBe('operation failed')
  })

  it('strips control characters but keeps normal text intact', () => {
    const err = new Error('ENOENT: no such file' + String.fromCharCode(1) + ' BAD/PATH-123')
    const out = sanitizeErrorMessage(err)
    expect(out).toBe('ENOENT: no such file BAD/PATH-123')
  })

  it('caps the length at 200 characters', () => {
    const err = new Error('x'.repeat(500))
    expect(sanitizeErrorMessage(err)).toHaveLength(200)
  })
})
