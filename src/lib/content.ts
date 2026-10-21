import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { Pack, Prompt } from '../types'
import { fetchAudioAsset } from './audio'
import { audioPathForPrompt, buildTextFiles } from './format'
import {
  DEFAULT_EPISODE_ID,
  DEFAULT_PACK_NAME,
  FIRST_PROMPT_ID,
  getPromptDuration,
} from './prompts'

export type ContentErrorCode =
  | 'invalidZip'
  | 'noQuestionJet'
  | 'badQuestionJet'
  | 'noPrompts'

export class ContentError extends Error {
  code: ContentErrorCode

  constructor(code: ContentErrorCode) {
    super(code)
    this.name = 'ContentError'
    this.code = code
  }
}

export interface ImportSummary {
  prompts: Prompt[]
  packName: string
  episodeId: number
  mp3Count: number
  customCount: number
  textMismatchCount: number
  fakeJokeCount: number
  manifestMissing: boolean
  assignedIds: number
  duplicateIds: number
  skippedPrompts: number
}

interface RawQuestion {
  id?: unknown
  prompt?: unknown
  x?: unknown
}

interface RawDataField {
  n?: unknown
  v?: unknown
}

export async function exportContentZip(pack: Pack): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {}

  for (const [path, text] of Object.entries(buildTextFiles(pack))) {
    files[path] = strToU8(text)
  }

  for (const prompt of pack.prompts) {
    const duration = getPromptDuration(prompt, pack.speed)
    files[audioPathForPrompt(prompt)] = await fetchAudioAsset(duration)
  }

  return zipSync(files, { level: 6 })
}

function readJson<T>(bytes: Uint8Array, errorCode: ContentErrorCode): T {
  try {
    return JSON.parse(strFromU8(bytes)) as T
  } catch {
    throw new ContentError(errorCode)
  }
}

export function importContentZip(bytes: Uint8Array): ImportSummary {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new ContentError('invalidZip')
  }

  const questionKeys = Object.keys(files)
    .filter((key) => key.endsWith('Question.jet'))
    .sort((a, b) => a.length - b.length)

  const questionKey = questionKeys[0]
  if (!questionKey) {
    throw new ContentError('noQuestionJet')
  }

  const root = questionKey.slice(0, -'Question.jet'.length)
  const manifestKey = `${root}manifest.jet`

  const question = readJson<{ content?: unknown; episodeid?: unknown }>(
    files[questionKey],
    'badQuestionJet',
  )
  if (!Array.isArray(question.content)) {
    throw new ContentError('badQuestionJet')
  }

  let manifest: { name?: unknown } | null = null
  if (files[manifestKey]) {
    try {
      manifest = JSON.parse(strFromU8(files[manifestKey])) as { name?: unknown }
    } catch {
      manifest = null
    }
  }

  const rawItems: Array<{
    text: string
    explicit: boolean
    rawId: number | null
  }> = []

  for (const item of question.content as RawQuestion[]) {
    if (!item || typeof item !== 'object' || typeof item.prompt !== 'string') {
      continue
    }
    const numericId = typeof item.id === 'number' ? item.id : Number(item.id)
    rawItems.push({
      text: item.prompt,
      explicit: Boolean(item.x),
      rawId: Number.isInteger(numericId) && numericId > 0 ? numericId : null,
    })
  }

  if (rawItems.length === 0) {
    throw new ContentError('noPrompts')
  }

  const maxId = rawItems.reduce(
    (max, item) => Math.max(max, item.rawId ?? FIRST_PROMPT_ID - 1),
    FIRST_PROMPT_ID - 1,
  )
  let nextId = maxId + 1
  let assignedIds = 0
  let duplicateIds = 0
  const usedIds = new Set<number>()
  const prompts: Prompt[] = rawItems.map((item) => {
    let id: number
    if (item.rawId !== null && !usedIds.has(item.rawId)) {
      id = item.rawId
    } else {
      if (item.rawId !== null) duplicateIds += 1
      else assignedIds += 1
      id = nextId
      nextId += 1
    }
    usedIds.add(id)
    return {
      id,
      text: item.text,
      explicit: item.explicit,
      durationMode: 'auto',
    }
  })

  const promptById = new Map(prompts.map((prompt) => [String(prompt.id), prompt]))
  let customCount = 0
  let textMismatchCount = 0
  let fakeJokeCount = 0

  for (const [key, dataBytes] of Object.entries(files)) {
    if (!key.endsWith('/data.jet')) continue
    const match = key.match(/Question\/([^/]+)\/data\.jet$/)
    if (!match) continue

    let data: { fields?: unknown }
    try {
      data = JSON.parse(strFromU8(dataBytes)) as { fields?: unknown }
    } catch {
      continue
    }
    if (!Array.isArray(data.fields)) continue

    const fieldMap = new Map<string, RawDataField>()
    for (const field of data.fields as RawDataField[]) {
      if (field && typeof field === 'object' && typeof field.n === 'string') {
        fieldMap.set(field.n, field)
      }
    }

    if (
      fieldMap.has('Custom') ||
      [...fieldMap.values()].some(
        (field) => field.n === 'true' && field.v === 'Custom',
      )
    ) {
      customCount += 1
    }

    const prompt = promptById.get(match[1])
    const promptText = fieldMap.get('PromptText')?.v
    if (
      prompt &&
      typeof promptText === 'string' &&
      promptText !== prompt.text
    ) {
      textMismatchCount += 1
    }

    const hasJokeAudio = String(fieldMap.get('HasJokeAudio')?.v).toLowerCase()
    const keywordAudio = fieldMap.get('KeywordResponseAudio')?.v
    if (hasJokeAudio === 'false' && typeof keywordAudio === 'string' && keywordAudio) {
      fakeJokeCount += 1
    }
  }

  const mp3Count = Object.keys(files).filter((key) =>
    key.toLowerCase().endsWith('.mp3'),
  ).length

  const manifestName =
    manifest && typeof manifest.name === 'string' ? manifest.name.trim() : ''
  const episodeNumber = Number(question.episodeid)

  return {
    prompts,
    packName: manifestName || DEFAULT_PACK_NAME,
    episodeId:
      Number.isFinite(episodeNumber) && episodeNumber > 0
        ? episodeNumber
        : DEFAULT_EPISODE_ID,
    mp3Count,
    customCount,
    textMismatchCount,
    fakeJokeCount,
    manifestMissing: !manifestName,
    assignedIds,
    duplicateIds,
    skippedPrompts: (question.content as unknown[]).length - rawItems.length,
  }
}
