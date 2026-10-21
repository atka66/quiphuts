import type { Issue, IssueCode, IssueSeverity, Pack, Prompt } from '../types'
import { normalizeForDuplicate } from './prompts'

const MAX_ORIGINAL_LENGTH = 121

const ALLOWED_TAGS = new Set([
  '<BLANK>',
  '<i>',
  '</i>',
  '<b>',
  '</b>',
  '<u>',
  '</u>',
  '<br>',
  '<br/>',
  '<br />',
])

const ALLOWED_PUNCTUATION = new Set([
  0x2013, // en dash
  0x2014, // em dash
  0x2018, // left single quote
  0x2019, // right single quote
  0x201c, // left double quote
  0x201d, // right double quote
  0x2026, // ellipsis
])

const HUNGARIAN_SPECIAL = new Set(['ő', 'Ő', 'ű', 'Ű'])

function isLikelySupportedChar(char: string): boolean {
  const codePoint = char.codePointAt(0)
  if (codePoint === undefined) return false
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true
  // Latin-1 letters and punctuation. The original prompts use ñ and common
  // accented Latin characters, so this range is the best-known-safe set.
  if (codePoint >= 0xa1 && codePoint <= 0xff) return true
  return ALLOWED_PUNCTUATION.has(codePoint)
}

function uniqueChars(text: string): string[] {
  return [...new Set(Array.from(text))]
}

function makeIssue(
  severity: IssueSeverity,
  code: IssueCode,
  prompt?: Prompt,
  index?: number,
  params?: Record<string, string | number>,
): Issue {
  return {
    severity,
    code,
    promptId: prompt?.id,
    index,
    params,
  }
}

export function validatePack(pack: Pack): Issue[] {
  const issues: Issue[] = []

  if (pack.prompts.length === 0) {
    issues.push(makeIssue('error', 'noPrompts'))
  }

  if (!pack.name.trim()) {
    issues.push(makeIssue('warning', 'packNameEmpty'))
  }

  const idCounts = new Map<number, number>()
  for (const prompt of pack.prompts) {
    idCounts.set(prompt.id, (idCounts.get(prompt.id) ?? 0) + 1)
  }

  const textCounts = new Map<string, number>()
  for (const prompt of pack.prompts) {
    const normalized = normalizeForDuplicate(prompt.text)
    if (normalized) {
      textCounts.set(normalized, (textCounts.get(normalized) ?? 0) + 1)
    }
  }

  pack.prompts.forEach((prompt, index) => {
    if ((idCounts.get(prompt.id) ?? 0) > 1) {
      issues.push(makeIssue('error', 'duplicateId', prompt, index))
    }

    if (!prompt.text.trim()) {
      issues.push(makeIssue('error', 'emptyPrompt', prompt, index))
      return
    }

    if (prompt.text.length > MAX_ORIGINAL_LENGTH) {
      issues.push(
        makeIssue('warning', 'longPrompt', prompt, index, {
          length: prompt.text.length,
          max: MAX_ORIGINAL_LENGTH,
        }),
      )
    }

    const normalized = normalizeForDuplicate(prompt.text)
    if (normalized && (textCounts.get(normalized) ?? 0) > 1) {
      issues.push(makeIssue('warning', 'duplicatePrompt', prompt, index))
    }

    const tags = prompt.text.match(/<[^>]*>/g) ?? []
    const unknownTags = [...new Set(tags.filter((tag) => !ALLOWED_TAGS.has(tag)))]
    if (unknownTags.length > 0) {
      issues.push(
        makeIssue('warning', 'unknownTag', prompt, index, {
          tags: unknownTags.join(' '),
        }),
      )
    }

    const lowercaseBlank = prompt.text.match(/<blank>/i)?.[0]
    if (lowercaseBlank && lowercaseBlank !== '<BLANK>') {
      issues.push(makeIssue('warning', 'lowercaseBlank', prompt, index, { tag: lowercaseBlank }))
    }

    if (/(_{2,}|\[blank\])/i.test(prompt.text)) {
      issues.push(makeIssue('warning', 'looksLikeBlank', prompt, index))
    }

    const withoutKnownTags = prompt.text
      .replace(/<BLANK>/g, '')
      .replace(/<[^>]*>/g, '')
    if (/[<>]/.test(withoutKnownTags)) {
      issues.push(makeIssue('warning', 'rawAngle', prompt, index))
    }

    if (/[\r\n]/.test(prompt.text)) {
      issues.push(makeIssue('warning', 'newlinePrompt', prompt, index))
    }

    const hungarianChars = uniqueChars(prompt.text).filter((char) =>
      HUNGARIAN_SPECIAL.has(char),
    )
    if (hungarianChars.length > 0) {
      issues.push(
        makeIssue('warning', 'hungarianChars', prompt, index, {
          chars: hungarianChars.join(' '),
        }),
      )
    }

    const unsupportedChars = uniqueChars(prompt.text).filter(
      (char) =>
        char !== '\r' &&
        char !== '\n' &&
        !HUNGARIAN_SPECIAL.has(char) &&
        !isLikelySupportedChar(char),
    )
    if (unsupportedChars.length > 0) {
      issues.push(
        makeIssue('warning', 'unsupportedChars', prompt, index, {
          chars: unsupportedChars.join(' '),
        }),
      )
    }
  })

  const severityOrder: Record<IssueSeverity, number> = { error: 0, warning: 1 }
  return issues.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    const indexDiff = (a.index ?? -1) - (b.index ?? -1)
    if (indexDiff !== 0) return indexDiff
    return a.code.localeCompare(b.code)
  })
}

export function issuesForPrompt(issues: Issue[], promptId: number): Issue[] {
  return issues.filter((issue) => issue.promptId === promptId)
}

export function countIssues(issues: Issue[]): { errors: number; warnings: number } {
  return issues.reduce(
    (counts, issue) => {
      if (issue.severity === 'error') counts.errors += 1
      else counts.warnings += 1
      return counts
    },
    { errors: 0, warnings: 0 },
  )
}
