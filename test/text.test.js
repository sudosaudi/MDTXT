import { describe, it, expect } from 'vitest'
import { stripMarkdown, getWordCount, getReadTimeMinutes } from '../src/renderer/lib/text.js'

describe('stripMarkdown', () => {
  it('removes heading markers but keeps the text', () => {
    expect(stripMarkdown('# Hello world').trim()).toBe('Hello world')
  })

  it('drops fenced code blocks entirely', () => {
    const md = 'before\n```js\nconst a = 1\nconst b = 2\n```\nafter'
    expect(stripMarkdown(md).trim().split(/\s+/)).toEqual(['before', 'after'])
  })

  it('keeps link text but drops the URL', () => {
    expect(stripMarkdown('see [the docs](https://example.com/x?y=1) now').trim())
      .toBe('see the docs now')
  })

  it('drops images completely', () => {
    expect(stripMarkdown('a ![cat](./cat.png) b').trim()).toBe('a   b')
  })

  it('removes emphasis markers', () => {
    expect(stripMarkdown('this is **bold** and _italic_').trim())
      .toBe('this is bold and italic')
  })
})

describe('getWordCount', () => {
  it('counts plain text words', () => {
    expect(getWordCount('one two three', '.txt')).toBe(3)
  })

  it('does not count markdown syntax as words', () => {
    const md = '# Title\n\nSome **bold** text with a [link](https://example.com).\n\n```\ncode code code\n```'
    // Title Some bold text with a link = 7
    expect(getWordCount(md, '.md')).toBe(7)
  })

  it('handles empty and whitespace-only input', () => {
    expect(getWordCount('', '.md')).toBe(0)
    expect(getWordCount('   \n  ', '.txt')).toBe(0)
    expect(getWordCount(null, '.md')).toBe(0)
  })
})

describe('getReadTimeMinutes', () => {
  it('is 0 for empty documents', () => {
    expect(getReadTimeMinutes(0)).toBe(0)
  })

  it('rounds at ~200 wpm with a 1 minute floor', () => {
    expect(getReadTimeMinutes(50)).toBe(1)
    expect(getReadTimeMinutes(200)).toBe(1)
    expect(getReadTimeMinutes(350)).toBe(2)
    expect(getReadTimeMinutes(1000)).toBe(5)
  })
})
