import { describe, expect, it } from 'vitest'
import type { Pack } from '../types'
import {
  asciiJson,
  buildDataJet,
  buildManifest,
  buildQuestionJet,
  buildTextFiles,
} from './format'
import { createDefaultPack, makePrompt } from './prompts'

function onePromptPack(text = 'The <BLANK> of all time'): Pack {
  return {
    ...createDefaultPack(),
    prompts: [makePrompt(1001, text)],
  }
}

describe('asciiJson', () => {
  it('escapes non-ASCII characters like the original .jet files', () => {
    expect(asciiJson({ text: 'It’s “fine” — ñ' })).toBe(
      '{"text":"It\\u2019s \\u201cfine\\u201d \\u2014 \\u00f1"}',
    )
  })

  it('round-trips through JSON.parse', () => {
    const value = { text: 'Ő and 😀' }
    expect(JSON.parse(asciiJson(value))).toEqual(value)
  })
})

describe('Q1 text files', () => {
  it('writes the original manifest shape', () => {
    expect(buildManifest('My Quiplash Pack')).toBe(
      '{"id":"Main","name":"My Quiplash Pack","types":["Question"]}',
    )
    expect(buildManifest('  ')).toBe(
      '{"id":"Main","name":"My Quiplash Pack","types":["Question"]}',
    )
  })

  it('writes Question.jet with content before episodeid', () => {
    expect(buildQuestionJet(onePromptPack())).toBe(
      '{"content":[{"x":false,"id":1001,"prompt":"The <BLANK> of all time"}],"episodeid":1234}',
    )
  })

  it('preserves the explicit flag', () => {
    const pack = onePromptPack()
    pack.prompts[0].explicit = true
    expect(buildQuestionJet(pack)).toContain('"x":true')
  })

  it('writes the original data.jet field order without Custom', () => {
    expect(buildDataJet(makePrompt(1001, 'The <BLANK> of all time'))).toBe(
      '{"fields":[' +
        '{"t":"B","v":"false","n":"HasJokeAudio"},' +
        '{"t":"S","v":"","n":"Keywords"},' +
        '{"t":"S","v":"","n":"Author"},' +
        '{"t":"S","v":"","n":"KeywordResponseText"},' +
        '{"t":"S","v":"The <BLANK> of all time","n":"PromptText"},' +
        '{"t":"S","v":"","n":"Location"},' +
        '{"t":"A","n":"KeywordResponseAudio"},' +
        '{"t":"A","v":"1001","n":"PromptAudio"}' +
        ']}',
    )
    expect(buildDataJet(makePrompt(1001, 'Test'))).not.toContain('"n":"Custom"')
  })

  it('points PromptAudio at the extensionless numeric name', () => {
    const data = JSON.parse(buildDataJet(makePrompt(1080, 'Test'))) as {
      fields: Array<{ n: string; v?: string }>
    }
    const fields = new Map(data.fields.map((field) => [field.n, field]))
    expect(fields.get('PromptAudio')).toEqual({ t: 'A', v: '1080', n: 'PromptAudio' })
    expect(fields.get('KeywordResponseAudio')).toEqual({
      t: 'A',
      n: 'KeywordResponseAudio',
    })
    expect(fields.has('Custom')).toBe(false)
  })

  it('escapes curly quotes in the prompt text', () => {
    const data = buildDataJet(makePrompt(1001, 'It’s “fine”'))
    expect(data).toContain('It\\u2019s \\u201cfine\\u201d')
    expect(JSON.parse(data).fields.find((field: { n: string }) => field.n === 'PromptText').v).toBe(
      'It’s “fine”',
    )
  })

  it('builds the expected content paths', () => {
    const pack: Pack = {
      ...createDefaultPack(),
      prompts: [makePrompt(1001, 'One'), makePrompt(1002, 'Two')],
    }
    const files = buildTextFiles(pack)
    expect(Object.keys(files).sort()).toEqual([
      'content/Question.jet',
      'content/Question/1001/data.jet',
      'content/Question/1002/data.jet',
      'content/manifest.jet',
    ])
  })
})
