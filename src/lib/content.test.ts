import { afterEach, describe, expect, it, vi } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { Pack } from '../types'
import { ContentError, exportContentZip, importContentZip } from './content'
import { createDefaultPack, makePrompt } from './prompts'

function zipFiles(files: Record<string, string | Uint8Array>): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const [path, value] of Object.entries(files)) {
    entries[path] = typeof value === 'string' ? strToU8(value) : value
  }
  return zipSync(entries)
}

function dataJet(promptText: string, options: { custom?: boolean; jokeAudio?: boolean } = {}): string {
  const fields: Array<Record<string, string>> = [
    { t: 'B', v: 'false', n: 'HasJokeAudio' },
    { t: 'S', v: promptText, n: 'PromptText' },
  ]
  if (options.custom) fields.push({ t: 'B', v: 'Custom', n: 'true' })
  fields.push({ t: 'A', v: 'joke', n: 'KeywordResponseAudio' })
  if (!options.jokeAudio) {
    fields[fields.length - 1] = { t: 'A', n: 'KeywordResponseAudio' }
  }
  return JSON.stringify({ fields })
}

function questionJet(
  content: Array<{ id?: number; prompt: string; x?: boolean }>,
  episodeid = 4321,
): string {
  return JSON.stringify({ content, episodeid })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('importContentZip', () => {
  it('imports prompts, IDs, x, pack name, and episode ID while ignoring audio', () => {
    const zip = zipFiles({
      'content/manifest.jet': JSON.stringify({
        id: 'Main',
        name: 'Imported Pack',
        types: ['Question'],
      }),
      'content/Question.jet': questionJet([
        { id: 1001, prompt: 'First', x: false },
        { id: 1002, prompt: 'Second', x: true },
      ]),
      'content/Question/1001/data.jet': dataJet('First'),
      'content/Question/1001/1001.mp3': new Uint8Array([1, 2, 3]),
      'content/Question/1002/data.jet': dataJet('Different text', {
        custom: true,
        jokeAudio: true,
      }),
      'content/Question/1002/1002.ogg': new Uint8Array([4, 5, 6]),
    })

    const result = importContentZip(zip)
    expect(result.prompts).toHaveLength(2)
    expect(result.prompts[0]).toMatchObject({
      id: 1001,
      text: 'First',
      explicit: false,
      durationMode: 'auto',
    })
    expect(result.prompts[1]).toMatchObject({
      id: 1002,
      text: 'Second',
      explicit: true,
    })
    expect(result.packName).toBe('Imported Pack')
    expect(result.episodeId).toBe(4321)
    expect(result.mp3Count).toBe(1)
    expect(result.customCount).toBe(1)
    expect(result.textMismatchCount).toBe(1)
    expect(result.fakeJokeCount).toBe(1)
    expect(result.manifestMissing).toBe(false)
    expect(result.assignedIds).toBe(0)
    expect(result.duplicateIds).toBe(0)
  })

  it('assigns new IDs for missing and duplicate IDs', () => {
    const zip = zipFiles({
      'content/Question.jet': questionJet([
        { id: 1001, prompt: 'A' },
        { id: 1001, prompt: 'B' },
        { prompt: 'C' },
      ]),
    })
    const result = importContentZip(zip)
    expect(result.duplicateIds).toBe(1)
    expect(result.assignedIds).toBe(1)
    expect(result.prompts.map((prompt) => prompt.id)).toEqual([1001, 1002, 1003])
    expect(new Set(result.prompts.map((prompt) => prompt.id)).size).toBe(3)
  })

  it('uses defaults when manifest.jet is missing', () => {
    const zip = zipFiles({
      'content/Question.jet': questionJet([{ id: 1001, prompt: 'One' }]),
    })
    const result = importContentZip(zip)
    expect(result.manifestMissing).toBe(true)
    expect(result.packName).toBe('My Quiplash Pack')
    expect(result.episodeId).toBe(4321)
  })

  it('rejects unreadable ZIPs', () => {
    expect(() => importContentZip(new Uint8Array([1, 2, 3]))).toThrow(ContentError)
    try {
      importContentZip(new Uint8Array([1, 2, 3]))
    } catch (error) {
      expect(error).toBeInstanceOf(ContentError)
      expect((error as ContentError).code).toBe('invalidZip')
    }
  })

  it('rejects archives without Question.jet', () => {
    const zip = zipFiles({ 'content/manifest.jet': '{}' })
    expect(() => importContentZip(zip)).toThrow(ContentError)
    try {
      importContentZip(zip)
    } catch (error) {
      expect((error as ContentError).code).toBe('noQuestionJet')
    }
  })

  it('rejects malformed and empty Question.jet files', () => {
    const malformed = zipFiles({
      'content/Question.jet': JSON.stringify({ content: 'not an array' }),
    })
    expect(() => importContentZip(malformed)).toThrow(ContentError)
    try {
      importContentZip(malformed)
    } catch (error) {
      expect((error as ContentError).code).toBe('badQuestionJet')
    }

    const empty = zipFiles({
      'content/Question.jet': questionJet([]),
    })
    expect(() => importContentZip(empty)).toThrow(ContentError)
    try {
      importContentZip(empty)
    } catch (error) {
      expect((error as ContentError).code).toBe('noPrompts')
    }
  })
})

describe('exportContentZip', () => {
  it('writes the content layout with OGG audio and no MP3 files', async () => {
    const audioBytes = new Uint8Array([0x4f, 0x67, 0x67, 0x53])
    const fetchMock = vi.fn(async (_url: string | URL | Request) => new Response(audioBytes, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const pack: Pack = {
      ...createDefaultPack(),
      prompts: [makePrompt(1001, 'One'), makePrompt(1002, 'Two')],
    }

    const zip = await exportContentZip(pack)
    const files = unzipSync(zip)
    const keys = Object.keys(files)

    expect(keys.sort()).toEqual([
      'content/Question.jet',
      'content/Question/1001/1001.ogg',
      'content/Question/1001/data.jet',
      'content/Question/1002/1002.ogg',
      'content/Question/1002/data.jet',
      'content/manifest.jet',
    ])
    expect(keys.some((key) => key.endsWith('.mp3'))).toBe(false)
    expect(files['content/Question/1001/1001.ogg']).toEqual(audioBytes)
    expect(fetchMock).toHaveBeenCalled()
    expect(String(fetchMock.mock.calls[0][0])).toContain('/audio/silence-1.5.ogg')

    const question = JSON.parse(strFromU8(files['content/Question.jet'])) as {
      content: unknown[]
      episodeid: number
    }
    expect(question.content).toHaveLength(2)
    expect(question.episodeid).toBe(1234)
  })
})
