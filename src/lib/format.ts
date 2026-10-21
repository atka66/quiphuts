import type { Pack, Prompt } from '../types'
import { audioPathForPrompt, packNameOrDefault } from './prompts'

/**
 * JSON.stringify with non-ASCII characters escaped. The original .jet files
 * use escapes such as \u2019, and this also keeps the output byte-stable.
 */
export function asciiJson(value: unknown): string {
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, (char) => {
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  })
}

export function buildManifest(packName: string): string {
  return asciiJson({
    id: 'Main',
    name: packNameOrDefault(packName),
    types: ['Question'],
  })
}

export function buildQuestionJet(pack: Pack): string {
  return asciiJson({
    content: pack.prompts.map((prompt) => ({
      x: prompt.explicit,
      id: prompt.id,
      prompt: prompt.text,
    })),
    episodeid: pack.episodeId,
  })
}

export function buildDataJet(prompt: Prompt): string {
  return asciiJson({
    fields: [
      { t: 'B', v: 'false', n: 'HasJokeAudio' },
      { t: 'S', v: '', n: 'Keywords' },
      { t: 'S', v: '', n: 'Author' },
      { t: 'S', v: '', n: 'KeywordResponseText' },
      { t: 'S', v: prompt.text, n: 'PromptText' },
      { t: 'S', v: '', n: 'Location' },
      { t: 'A', n: 'KeywordResponseAudio' },
      { t: 'A', v: String(prompt.id), n: 'PromptAudio' },
    ],
  })
}

export function buildTextFiles(pack: Pack): Record<string, string> {
  const files: Record<string, string> = {
    'content/manifest.jet': buildManifest(pack.name),
    'content/Question.jet': buildQuestionJet(pack),
  }

  for (const prompt of pack.prompts) {
    files[`content/Question/${prompt.id}/data.jet`] = buildDataJet(prompt)
  }

  return files
}

export { audioPathForPrompt }
