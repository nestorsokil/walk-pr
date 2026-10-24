export type Area = 'purple' | 'teal' | 'coral' | 'blue'
export type Mode = 'tour' | 'build'
export type StageState = 'pending' | 'current' | 'done' | 'skipped' | 'running' | 'blocked'
export type Decision = 'later' | 'raise' | 'drop'

export type Stage = {
  name: string
  role?: string
  area?: Area
  state: StageState
  concerns: number
  severe?: number
  minor?: number
  fixed?: number
  isRequired?: boolean
  commits?: string[]
}

// A choice the reader makes on a build decision; chosen is the index into options.
export type Option = { label: string; note?: string; isRecommended?: boolean }

export type Finding = {
  n: number
  label: string
  text: string
  where: string
  decision: Decision
  options?: Option[]
  chosen?: number
  isUnverified?: boolean
  resolution?: 'fixed' | 'partial'
  comment?: string
  stage?: string
  posted?: boolean
  raisedBy?: string
  thread?: { replies: number; lastBy: string; isResolved?: boolean }
  reply?: string
}

// A click in the pane until the skill has been told about it; sent ones are dropped on the next set.
export type PendingDecision = { n: number; decision?: 'raise' | 'drop'; chosen?: number; isSent: boolean }

export type Tour = {
  mode?: Mode
  plan?: { file: string }
  title: string
  url?: string
  author?: string
  links?: { label: string; url: string }[]
  kind: string
  complexity?: 'easy' | 'medium' | 'complex'
  size?: { additions: number; deletions: number }
  verdict: string
  stages: Stage[]
  findings: Finding[]
  prompts: string[]
  nextLabel?: string
  isFinished?: boolean
  isBusy?: boolean
  pendingDecisions?: PendingDecision[]
  outcome?: { label: string; url?: string }
  diagram?: Diagram
}

export type Diagram = {
  file: string
  alt: string
  generation?: number
  columns?: number
  rows?: number
}

declare module 'claude-code' {
  interface PluginState {
    'walk-pr': { tour: Tour | null; missing: string[] }
  }
}
