import { getAudioKey } from './prompts'

const cache = new Map<string, Uint8Array>()

export function audioAssetUrl(duration: number): string {
  const key = getAudioKey(duration)
  return `${import.meta.env.BASE_URL}audio/silence-${key}.ogg`
}

export async function fetchAudioAsset(duration: number): Promise<Uint8Array> {
  const key = getAudioKey(duration)
  const cached = cache.get(key)
  if (cached) return cached

  const url = audioAssetUrl(duration)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Missing audio asset: ${url}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  cache.set(key, bytes)
  return bytes
}
