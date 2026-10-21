export type Lang = 'en' | 'hu'

export interface Prompt {
  id: number
  text: string
  explicit: boolean
}

export interface Pack {
  name: string
  prompts: Prompt[]
  episodeId: number
  /**
   * Reading speed used by the automatic duration calculation, in characters
   * per second.
   */
  speed: number
}

export type IssueSeverity = 'error' | 'warning'

export type IssueCode =
  | 'noPrompts'
  | 'emptyPrompt'
  | 'duplicateId'
  | 'longPrompt'
  | 'duplicatePrompt'
  | 'unknownTag'
  | 'unsupportedChars'
  | 'hungarianChars'
  | 'lowercaseBlank'
  | 'looksLikeBlank'
  | 'rawAngle'
  | 'newlinePrompt'
  | 'packNameEmpty'

export interface Issue {
  severity: IssueSeverity
  code: IssueCode
  promptId?: number
  index?: number
  params?: Record<string, string | number>
}

export interface StatusNotice {
  kind: 'success' | 'error' | 'info'
  key: string
  params?: Record<string, string | number>
}
