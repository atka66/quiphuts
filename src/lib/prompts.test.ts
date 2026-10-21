import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SPEED,
  autoDurationForPrompt,
  getAudioKey,
  makePrompt,
  nextPromptId,
  normalizeForDuplicate,
  packNameOrDefault,
  parsePromptList,
  roundDuration,
  speedFromStorage,
  visibleLength,
} from './prompts'

describe('parsePromptList', () => {
  it('splits CRLF and LF, trims lines, and removes blanks', () => {
    const text = '\uFEFF  First prompt  \r\n\r\nSecond prompt\n   \nThird prompt\r'
    expect(parsePromptList(text)).toEqual(['First prompt', 'Second prompt', 'Third prompt'])
  })

  it('returns an empty array for empty input', () => {
    expect(parsePromptList(' \n \r\n ')).toEqual([])
  })

  it('creates prompts with auto metadata defaults', () => {
    const prompt = makePrompt(1001, 'One')
    expect(prompt).toEqual({ id: 1001, text: 'One', explicit: false })
  })
})

describe('durations', () => {
  it('counts only visible text and treats <BLANK> as five characters', () => {
    expect(visibleLength('Hello <BLANK>')).toBe(11)
    expect(visibleLength('Hello <i>there</i>')).toBe(11)
    expect(visibleLength('<b><BLANK></b>')).toBe(5)
  })

  it('rounds and clamps to half-second steps', () => {
    expect(roundDuration(2.26)).toBe(2.5)
    expect(roundDuration(0.1)).toBe(1)
    expect(roundDuration(40)).toBe(15)
    expect(roundDuration(Number.NaN)).toBe(1)
  })

  it('uses the reading speed and clamps short prompts to 1.5 seconds', () => {
    expect(autoDurationForPrompt('Hi', DEFAULT_SPEED)).toBe(1.5)
    expect(autoDurationForPrompt('A'.repeat(90), 18)).toBe(6)
    expect(autoDurationForPrompt('A'.repeat(400), 18)).toBe(15)
  })

  it('keeps auto durations consistent with the reading speed', () => {
    const prompt = makePrompt(1001, 'A short prompt')
    expect(autoDurationForPrompt(prompt.text, 18)).toBe(2)
  })

  it('formats audio asset keys with one decimal place', () => {
    expect(getAudioKey(1)).toBe('1.0')
    expect(getAudioKey(4.24)).toBe('4.0')
    expect(getAudioKey(20)).toBe('15.0')
  })
})

describe('prompt helpers', () => {
  it('finds the next ID after the highest prompt ID', () => {
    expect(nextPromptId([])).toBe(1001)
    expect(nextPromptId([makePrompt(1001), makePrompt(1080)])).toBe(1081)
    expect(nextPromptId([makePrompt(9)])).toBe(1001)
  })

  it('normalizes duplicate comparisons', () => {
    expect(normalizeForDuplicate('  Hello   World  ')).toBe('hello world')
  })

  it('falls back for an empty pack name', () => {
    expect(packNameOrDefault('  ')).toBe('My Quiplash Pack')
    expect(packNameOrDefault(' My Pack ')).toBe('My Pack')
  })

  it('accepts only the supported speed values', () => {
    expect(speedFromStorage(14)).toBe(14)
    expect(speedFromStorage('22')).toBe(22)
    expect(speedFromStorage(99)).toBe(DEFAULT_SPEED)
  })
})
