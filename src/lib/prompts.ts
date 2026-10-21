import type { Pack, Prompt } from '../types'

export const FIRST_PROMPT_ID = 1001
export const DEFAULT_EPISODE_ID = 1234
export const DEFAULT_SPEED = 18
export const DEFAULT_PACK_NAME = 'My Quiplash Pack'
export const MIN_DURATION = 1
export const MAX_DURATION = 15
export const DURATION_STEP = 0.5

export const SPEEDS = [
  { value: 14, labelKey: 'settings.speedRelaxed' },
  { value: 18, labelKey: 'settings.speedNormal' },
  { value: 22, labelKey: 'settings.speedFast' },
] as const

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function roundDuration(value: number): number {
  if (!Number.isFinite(value)) return MIN_DURATION
  const rounded = Math.round(value / DURATION_STEP) * DURATION_STEP
  return clamp(Number(rounded.toFixed(1)), MIN_DURATION, MAX_DURATION)
}

/**
 * The game's prompt font does not render tags. Count only the visible text.
 * <BLANK> is treated as a short word so it contributes to reading time.
 */
export function visibleLength(text: string): number {
  const withoutBlank = text.replace(/<BLANK>/g, '_____')
  const withoutTags = withoutBlank.replace(/<[^>]*>/g, '')
  return Array.from(withoutTags).length
}

export function autoDurationForPrompt(text: string, speed: number): number {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_SPEED
  return roundDuration(clamp(1 + visibleLength(text) / safeSpeed, 1.5, MAX_DURATION))
}

export function getPromptDuration(prompt: Prompt, speed: number): number {
  if (prompt.durationMode === 'manual' && prompt.manualDuration !== undefined) {
    return roundDuration(prompt.manualDuration)
  }
  return autoDurationForPrompt(prompt.text, speed)
}

export function makePrompt(id: number, text = ''): Prompt {
  return {
    id,
    text,
    explicit: false,
    durationMode: 'auto',
  }
}

export function parsePromptList(text: string): string[] {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function promptsFromText(text: string, startId = FIRST_PROMPT_ID): Prompt[] {
  return parsePromptList(text).map((promptText, index) => makePrompt(startId + index, promptText))
}

export function nextPromptId(prompts: Prompt[]): number {
  const maxId = prompts.reduce(
    (max, prompt) => (Number.isFinite(prompt.id) ? Math.max(max, prompt.id) : max),
    FIRST_PROMPT_ID - 1,
  )
  return maxId + 1
}

export function normalizeForDuplicate(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function packNameOrDefault(name: string): string {
  return name.trim() || DEFAULT_PACK_NAME
}

export function getAudioKey(duration: number): string {
  return roundDuration(duration).toFixed(1)
}

export function audioPathForPrompt(prompt: Prompt): string {
  return `content/Question/${prompt.id}/${prompt.id}.ogg`
}

export function createDefaultPack(): Pack {
  return {
    name: DEFAULT_PACK_NAME,
    prompts: [],
    episodeId: DEFAULT_EPISODE_ID,
    speed: DEFAULT_SPEED,
  }
}

export function speedFromStorage(value: unknown): number {
  const speed = Number(value)
  return SPEEDS.some((option) => option.value === speed) ? speed : DEFAULT_SPEED
}
