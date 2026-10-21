import { describe, expect, it } from 'vitest'
import type { Pack } from '../types'
import { createDefaultPack, makePrompt } from './prompts'
import { countIssues, issuesForPrompt, validatePack } from './validation'

function packWith(texts: string[]): Pack {
  return {
    ...createDefaultPack(),
    prompts: texts.map((text, index) => makePrompt(1001 + index, text)),
  }
}

function codes(pack: Pack): string[] {
  return validatePack(pack).map((issue) => issue.code)
}

describe('validatePack', () => {
  it('requires at least one prompt', () => {
    expect(codes(createDefaultPack())).toContain('noPrompts')
  })

  it('warns about an empty pack name', () => {
    const pack = { ...packWith(['A prompt']), name: '   ' }
    expect(codes(pack)).toContain('packNameEmpty')
  })

  it('treats empty prompts as errors', () => {
    expect(codes(packWith(['   ']))).toContain('emptyPrompt')
  })

  it('warns when a prompt is longer than the original maximum', () => {
    const pack = packWith(['A'.repeat(122)])
    const issues = validatePack(pack)
    expect(issues.some((issue) => issue.code === 'longPrompt')).toBe(true)
    expect(issues.find((issue) => issue.code === 'longPrompt')?.params).toEqual({
      length: 122,
      max: 121,
    })
  })

  it('warns about duplicate prompts and duplicate IDs', () => {
    const pack = packWith(['Same prompt', ' same   prompt '])
    pack.prompts[1] = { ...pack.prompts[1], id: pack.prompts[0].id }
    const issues = validatePack(pack)
    expect(issues.some((issue) => issue.code === 'duplicatePrompt')).toBe(true)
    expect(issues.filter((issue) => issue.code === 'duplicateId')).toHaveLength(2)
  })

  it('allows known tags without warnings', () => {
    const pack = packWith(['The <BLANK> is <i>very</i> <b>serious</b>.'])
    expect(validatePack(pack)).toEqual([])
  })

  it('warns about unknown tags and lowercase blanks', () => {
    const pack = packWith(['A <foo> and a <blank>.'])
    const found = codes(pack)
    expect(found).toContain('unknownTag')
    expect(found).toContain('lowercaseBlank')
  })

  it('warns about blank-like text and bare angle brackets', () => {
    const pack = packWith(['Fill in ___ here', 'Is 1 < 2?'])
    const found = codes(pack)
    expect(found).toContain('looksLikeBlank')
    expect(found).toContain('rawAngle')
  })

  it('warns about newlines and unsupported characters', () => {
    const pack = packWith(['Line one\nLine two', 'Ő and 😀', 'ñ and “quotes”'])
    const issues = validatePack(pack)
    expect(issues.some((issue) => issue.code === 'newlinePrompt')).toBe(true)
    expect(issues.some((issue) => issue.code === 'hungarianChars')).toBe(true)
    expect(issues.some((issue) => issue.code === 'unsupportedChars')).toBe(true)
    expect(issues.some((issue) => issue.code === 'unsupportedChars' && issue.index === 2)).toBe(false)
  })

  it('exposes helpers for filtering and counting', () => {
    const pack = packWith(['', 'A'.repeat(122)])
    const issues = validatePack(pack)
    const counts = countIssues(issues)
    expect(counts.errors).toBe(1)
    expect(counts.warnings).toBeGreaterThan(0)
    expect(issuesForPrompt(issues, 1001).length).toBeGreaterThan(0)
  })
})
