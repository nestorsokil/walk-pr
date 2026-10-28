import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Area, PendingDecision, Tour } from '../types'

const PANE = 'walk-pr'
const TITLE = 'PR tour'
const tour = atom({ plugin: 'walk-pr', key: 'tour' } as const, null as Tour | null)
const missing = atom({ plugin: 'walk-pr', key: 'missing' } as const, [] as string[])

const REQUIRED: ReadonlyArray<readonly [string, string]> = [
  ['gh', 'gh (GitHub CLI): reads and reviews PRs'],
  ['git', 'git: reads the before and after code'],
  ['npx', 'node/npx: renders diagrams in a terminal'],
]

const AREA_COLOR: Record<Area, string> = {
  purple: '#7F77DD',
  teal: '#1D9E75',
  coral: '#D85A30',
  blue: '#378ADD',
}

const ROLE_AREA: Record<string, Area> = {
  problem: 'coral',
  solution: 'purple',
  mechanism: 'teal',
  boundary: 'teal',
  data: 'teal',
  rollout: 'blue',
  risk: 'blue',
  cleanup: 'blue',
}

const stageColor = (s: { role?: string; area?: Area }): string => {
  const byRole = s.role ? ROLE_AREA[s.role.toLowerCase()] : undefined

  return AREA_COLOR[byRole ?? s.area ?? 'teal']
}

const TOOL = 'mcp__walk-pr__set'

const tourId = (t: Tour): string => t.url ?? t.title
const isSameTour = (a: Tour, b: Tour): boolean => tourId(a) === tourId(b)

const unsent = (t: Tour): PendingDecision[] => (t.pendingDecisions ?? []).filter(d => !d.isSent)
const decisionsLine = (pending: PendingDecision[]): string =>
  pending.map(d => (d.chosen !== undefined ? `${d.n} option ${d.chosen + 1}` : `${d.n} ${d.decision}`)).join(', ')
const markSent = (t: Tour): Tour => ({ ...t, pendingDecisions: (t.pendingDecisions ?? []).map(d => ({ ...d, isSent: true })) })

export const register: Register = (on, options) => {
  const paneBackground = typeof options.paneBackground === 'string' && options.paneBackground.trim() !== '' ? options.paneBackground.trim() : undefined
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'set',
      description:
        'Replace the walk-pr side pane with a tour state: title, kind, verdict, stages, every finding (the current stage\'s first, with its stage chip highlighted), contextual prompts, and the next-stage label. Opens the pane when closed. Pass null to clear it. Every button in the pane submits a prompt directly, so the reader never types. mode "build" is the plan-and-implement tour: findings carry options the reader picks, stages carry the commits made, plan names the plan file the Open plan button opens.',
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          tour: {
            type: ['object', 'null'],
            properties: {
              mode: { type: 'string', enum: ['tour', 'build'], description: 'tour (default) reviews a PR; build plans and implements a change' },
              plan: {
                type: 'object',
                description: 'build mode: the plan file; the pane shows an Open plan button that opens it',
                properties: { file: { type: 'string', description: 'absolute path' } },
                required: ['file'],
              },
              title: { type: 'string' },
              url: { type: 'string', description: 'the PR page; the pane shows an Open in GitHub button' },
              author: { type: 'string', description: 'who opened the PR, full name when GitHub has one, else the login' },
              links: {
                type: 'array',
                description: 'up to 3 context links drawn as buttons after Open in GitHub: the ticket first, then a Claude artifact, then one more (ADR, doc, chat thread)',
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: { label: { type: 'string', description: 'short button text, e.g. the ticket ID, Artifact, ADR, Chat thread' }, url: { type: 'string' } },
                  required: ['label', 'url'],
                },
              },
              kind: { type: 'string' },
              complexity: { type: 'string', enum: ['easy', 'medium', 'complex'], description: 'how hard the PR is to review, shown as a chip beside the kind' },
              size: {
                type: 'object',
                description: 'diff size shown as +additions -deletions, from gh pr view --json additions,deletions',
                properties: { additions: { type: 'integer' }, deletions: { type: 'integer' } },
                required: ['additions', 'deletions'],
              },
              verdict: { type: 'string' },
              stages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: { type: 'string', description: 'one-word prefix; also picks the colour: Problem coral, Solution purple, Mechanism/Boundary/Data teal, Rollout/Risk/Cleanup blue' },
                    area: { type: 'string', enum: ['purple', 'teal', 'coral', 'blue'], description: 'fallback colour when role is not one of the known ones' },
                    state: { type: 'string', enum: ['pending', 'current', 'done', 'skipped', 'running', 'blocked'], description: 'running and blocked are build-mode states: being implemented, or waiting on a decision' },
                    commits: { type: 'array', items: { type: 'string' }, description: 'build mode: short SHA and title of each commit made for this stage, "a1b2c3d title"' },
                    concerns: { type: 'integer', description: 'severe + minor; pre-existing findings count nowhere. The pane recounts every chip from the findings whose stage is this one, so these must agree with them' },
                    severe: { type: 'integer', description: 'issues in this stage' },
                    minor: { type: 'integer', description: 'questions, suggestions, nitpicks in this stage; not pre-existing' },
                    fixed: { type: 'integer', description: 'findings in this stage the author fixed since they were posted' },
                    isRequired: { type: 'boolean' },
                  },
                  required: ['name', 'role', 'state', 'concerns'],
                },
              },
              findings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    n: { type: 'integer' },
                    label: { type: 'string' },
                    text: { type: 'string' },
                    where: { type: 'string', description: 'file path and line at the head, "path:line"; with a PR url the pane links it to that line in the PR diff' },
                    decision: { type: 'string', enum: ['later', 'raise', 'drop'] },
                    options: {
                      type: 'array',
                      description: 'build mode: the choices for a decision; the pane draws one button each and the recommended one as primary',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string', description: 'two to five words' },
                          note: { type: 'string', description: 'one line: what it costs or buys' },
                          isRecommended: { type: 'boolean' },
                        },
                        required: ['label'],
                      },
                    },
                    chosen: { type: 'integer', description: 'index into options once the reader decided; absent until then' },
                    isUnverified: { type: 'boolean', description: 'the code alone could not settle it; the comment is phrased as a question' },
                    resolution: { type: 'string', enum: ['fixed', 'partial'], description: 'set on resume when new commits address a posted finding fully or in part' },
                    comment: { type: 'string', description: 'the exact review comment body that Raise posts for this finding; shown verbatim on the finish screen' },
                    stage: { type: 'string', description: 'name of the stage the finding belongs to; findings are always all sent, the pane lists the current stage\'s first with the stage chip highlighted' },
                    posted: { type: 'boolean', description: 'true once the comment is on GitHub' },
                    raisedBy: { type: 'string', description: 'another reviewer already raised this on the PR; set with posted and the thread, never posted again' },
                    thread: {
                      type: 'object',
                      description: 'set when the posted comment has replies on GitHub',
                      properties: {
                        replies: { type: 'integer' },
                        lastBy: { type: 'string', description: 'who wrote the latest reply, full name or login' },
                        isResolved: { type: 'boolean' },
                      },
                      required: ['replies', 'lastBy'],
                    },
                    reply: { type: 'string', description: 'the next reply drafted for the thread, shown verbatim; Post reply sends it' },
                  },
                  required: ['n', 'label', 'text', 'where', 'decision'],
                },
              },
              prompts: { type: 'array', items: { type: 'string' } },
              nextLabel: { type: 'string' },
              isFinished: { type: 'boolean' },
              diagram: {
                type: 'object',
                description: 'a rendered PNG of the stage diagram, drawn in the pane on a terminal that shows images, scaled up to the pane width; file is an absolute path, rows = ceil(columns / (2 * width / height)), generation bumps when the file changes under the same path',
                properties: {
                  file: { type: 'string' },
                  alt: { type: 'string' },
                  generation: { type: 'integer' },
                  columns: { type: 'integer', description: 'default 60' },
                  rows: { type: 'integer', description: 'default 14' },
                },
                required: ['file', 'alt'],
              },
              outcome: {
                type: 'object',
                description: 'set after the review was posted or the tour closed; the pane then shows it with Resume tour, Check PR for updates and, unless the label is Approved, Merged or Closed, Approve',
                properties: { label: { type: 'string' }, url: { type: 'string' } },
                required: ['label'],
              },
            },
            required: ['title', 'kind', 'verdict', 'stages', 'findings', 'prompts'],
          },
        },
        required: ['tour'],
      },
    })
    await $.command.register({
      name: 'walk-pr-pane',
      description: 'Reopen the PR tour pane',
    })
    if (await read($, tour)) {
      try {
        await $.ui.open({ id: PANE, title: TITLE })
      } catch {
        // no surface attached yet; /walk-pr-pane reopens it
      }
    }
    void (async () => {
      const absent: string[] = []
      for (const [bin, why] of REQUIRED) {
        const found = await $.process.run([bin, '--version'], { timeoutMs: 5000 }).then(r => r.exitCode === 0, () => false)
        if (!found) {
          absent.push(why)
        }
      }
      await update($, missing, () => absent)
      if (absent.length > 0) {
        $.ui.toast(`walk-pr: missing ${absent.map(a => a.split(':')[0]).join(', ')}`)
      }
    })()

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (!e.tool.endsWith('walk-pr__set')) {
      return next(e)
    }
    try {
      const incoming = (e as unknown as { tour?: Tour | null }).tour ?? null
      await update($, tour, prev => {
        if (!incoming || !prev || !isSameTour(prev, incoming)) {
          return incoming
        }
        const pending = unsent(prev)
        const kept = new Map(pending.map(d => [d.n, d]))
        const applied = (f: Tour['findings'][number]) => {
          const d = kept.get(f.n)
          if (!d) {
            return f
          }

          return d.chosen !== undefined ? { ...f, chosen: d.chosen } : { ...f, decision: d.decision ?? f.decision }
        }

        return {
          ...incoming,
          findings: incoming.findings.map(applied),
          pendingDecisions: pending,
        }
      })
      const next_ = incoming
      if (next_) {
        await $.ui.open({ id: PANE, title: TITLE })
      }

      return { result: next_ ? 'Pane updated.' : 'Pane cleared.' }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      $.ui.toast(`walk-pr: ${reason}`)

      return { deny: `walk-pr failed: ${reason}` }
    }
  })

  on('prompt.submit', async ($, e, next) => {
    const t = await read($, tour)
    if (!t) {
      return next(e)
    }
    const isFromPane = e.origin?.kind === 'plugin' && e.origin.name === 'walk-pr'
    if (!isFromPane) {
      // a typed tour command is a tour turn like a click; anything else is not
      const isTourTurn = e.text.startsWith('walk-pr:')
      await update($, tour, cur => (cur ? { ...cur, isBusy: isTourTurn } : cur))
    }
    const pending = unsent(t)
    if (pending.length === 0) {
      return next(e)
    }
    await update($, tour, cur => (cur ? markSent(cur) : cur))

    return next({ ...e, context: [...(e.context ?? []), `walk-pr pane decisions since the last set: ${decisionsLine(pending)}. Record them and send them back in the next set call.`] })
  })

  on('session.attach', async ($, e, next) => {
    // a tour built unattended (a scheduled run) has no surface to draw on until someone opens the session
    const t = await read($, tour)
    if (t) {
      void $.ui.open({ id: PANE, title: TITLE }).catch(() => undefined)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const before = await read($, tour)
    await update($, tour, t => (t && t.isBusy ? { ...t, isBusy: false } : t))
    if (before?.isBusy) {
      // focus is granted only over an idle, empty composer, so only after the turn
      void $.ui.open({ id: PANE, title: TITLE, focus: true }).catch(() => undefined)
    }

    return next(e)
  })

  on('command.run', { command: 'walk-pr-pane' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: 'PR tour pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const state = await read($, tour)
    const onTerminal = e.surface === 'terminal'
    const picture = (() => {
      if (e.surface !== 'terminal' || !state?.diagram) {
        return null
      }
      const { Image } = $.ui.resolve(e)
      const d = state.diagram
      // Image columns cap at 255; rows keep the aspect the skill computed for its own columns.
      const bodyColumns = (e.props as { bodyColumns?: number }).bodyColumns ?? 0
      const wanted = d.columns ?? 60
      const columns = Math.max(wanted, Math.min(255, bodyColumns - 2))
      const rows = Math.max(1, Math.round((d.rows ?? 14) * (columns / wanted)))

      return (
        <Image
          key="diagram"
          source={{ file: d.file, format: 'png', generation: d.generation }}
          columns={columns}
          rows={rows}
          alt={d.alt}
        />
      )
    })()
    const Chip = (props: { color: string; label: string; key?: string }) =>
      onTerminal ? (
        <Text color={props.color}>{props.label}</Text>
      ) : (
        <Text backgroundColor={props.color} color="inverseText"> {props.label} </Text>
      )
    const decide = (n: number, decision: 'raise' | 'drop') => () => {
      void update($, tour, t =>
        t
          ? {
              ...t,
              findings: t.findings.map(f => (f.n === n ? { ...f, decision } : f)),
              pendingDecisions: [...(t.pendingDecisions ?? []).filter(d => d.n !== n), { n, decision, isSent: false }],
            }
          : t,
      )
    }
    const choose = (n: number, chosen: number) => () => {
      void update($, tour, t =>
        t
          ? {
              ...t,
              findings: t.findings.map(f => (f.n === n ? { ...f, chosen } : f)),
              pendingDecisions: [...(t.pendingDecisions ?? []).filter(d => d.n !== n), { n, chosen, isSent: false }],
            }
          : t,
      )
    }
    const openUrl = (url: string) => () => {
      const openers = [['open', url], ['xdg-open', url], ['cmd', '/c', 'start', '', url]]
      const tryNext = (i: number): Promise<unknown> =>
        i >= openers.length
          ? Promise.resolve($.ui.toast(url))
          : $.process.run(openers[i], { timeoutMs: 5000 }).then(r => (r.exitCode === 0 ? r : tryNext(i + 1)), () => tryNext(i + 1))
      void tryNext(0)
    }
    // GitHub anchors a PR diff file by the sha256 of its path; R<n> is the line on the head side.
    const diffAnchor = async (prUrl: string, where: string): Promise<string | undefined> => {
      if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(prUrl)) {
        return undefined
      }
      const m = /([^\s:()`]+\/[^\s:()`]+|[^\s:()`]+\.[A-Za-z0-9]+)(?::(\d+))?/.exec(where)
      if (!m) {
        return undefined
      }
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m[1]))
      const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
      return `${prUrl.replace(/\/?$/, '')}/files#diff-${hex}${m[2] ? `R${m[2]}` : ''}`
    }
    const whereUrls = new Map<number, string>()
    if (state?.url) {
      const prUrl = state.url
      await Promise.all(
        state.findings.map(async f => {
          const u = await diffAnchor(prUrl, f.where)
          if (u) {
            whereUrls.set(f.n, u)
          }
        }),
      )
    }
    const fill = (text: string) => () => {
      void $.prompt.fill({ text, mode: 'replace' }).then(r => (r.isFilled ? undefined : $.ui.toast(text)))
    }
    const send = (text: string) => async () => {
      const t = await read($, tour)
      if (!t || t.isBusy) {
        return
      }
      const pending = unsent(t)
      const suffix = pending.length > 0 ? ` (findings: ${decisionsLine(pending)})` : ''
      await update($, tour, cur => (cur ? { ...markSent(cur), isBusy: true } : cur))
      const unlock = (reason: string) => {
        void update($, tour, cur => (cur ? { ...cur, isBusy: false } : cur))
        $.ui.toast(`walk-pr: not sent, ${reason}`)
      }
      void $.prompt.submit({ text: `${text}${suffix}`, asUser: true }).then(
        r => ('drop' in r ? unlock(r.drop ?? 'dropped') : undefined),
        err => unlock(err instanceof Error ? err.message : String(err)),
      )
    }

    const bg = onTerminal ? paneBackground : undefined
    const absent = await read($, missing)

    if (!state) {
      return (
        <Box flexDirection="column" padding={1} backgroundColor={bg} minHeight="100%">
          <Text dimColor>No tour running. Start one with /walk-pr:tour (review a PR) or /walk-pr:build (plan and implement a change).</Text>
          {absent.length > 0 && <Text color="warning">Missing on this machine:</Text>}
          {absent.map(a => (
            <Text key={`missing:${a}`} dimColor>
              {'  '}{a}
            </Text>
          ))}
        </Box>
      )
    }

    const current = state.stages.find(s => s.state === 'current' || s.state === 'running' || s.state === 'blocked')
    const unseen = state.stages.filter(s => s.state !== 'done')
    const busy = state.isBusy === true
    const closed = state.outcome !== undefined
    const canApproveAfterOutcome = closed && !['Approved', 'Merged', 'Closed'].includes(state.outcome!.label)
    const allAddressed = state.findings
      .filter(f => f.posted || f.decision === 'raise')
      .every(f => f.resolution === 'fixed' || f.thread?.isResolved)
    const isBuild = state.mode === 'build'
    const undecided = state.findings.filter(f => f.options && f.chosen === undefined)
    // in build mode Raise means fix it and Drop means leave it
    const raiseLabel = isBuild ? 'Fix' : 'Raise'
    const dropLabel = isBuild ? 'Skip' : 'Drop'
    // the current stage's findings come first and carry a highlighted stage chip
    const isHere = (f: { stage?: string }) => Boolean(current && f.stage === current.name)
    // stage chips are counted from the findings themselves, so a chip and a card never disagree
    const countsOf = (stage: string) => {
      const here = state.findings.filter(f => f.stage === stage)
      const open = here.filter(f => f.resolution !== 'fixed' && f.decision !== 'drop')
      return {
        fixed: here.filter(f => f.resolution === 'fixed').length,
        severe: open.filter(f => !f.options && f.label === 'issue').length,
        minor: open.filter(f => !f.options && f.label !== 'issue' && f.label !== 'pre-existing').length,
        decisions: open.filter(f => f.options && f.chosen === undefined).length,
      }
    }
    const label = (s: { name: string; role?: string }) => (s.role ? `${s.role}: ${s.name}` : s.name)
    const nameWidth = Math.max(...state.stages.map(s => label(s).length)) + 4
    const prNumber = state.url ? /\/pull\/(\d+)/.exec(state.url)?.[1] : undefined
    const kindColor = state.kind.includes('bug') ? 'error' : state.kind.includes('refactor') ? 'claude' : 'success'
    const complexityColor = (c: string) => (c === 'easy' ? 'success' : c === 'medium' ? 'warning' : 'error')
    const outcomeColor = (label: string) =>
      /approved|merged/i.test(label) ? 'success' : /changes/i.test(label) ? 'error' : /commented/i.test(label) ? 'claude' : 'inactive'
    const decisionChip = (d: string) =>
      d === 'raise' ? <Chip color="error" label="raised" /> : d === 'drop' ? <Chip color="inactive" label="dropped" /> : <Chip color="warning" label={d} />

    return (
      <Box flexDirection="column" paddingX={1} paddingY={1} gap={1} backgroundColor={bg} minHeight="100%">
        <Box flexDirection="column">
          <Box gap={1}>
            {prNumber && <Text color="claude">#{prNumber}</Text>}
            <Text bold={!onTerminal}>{state.title}</Text>
            {state.author && <Text dimColor>by {state.author}</Text>}
          </Box>
          <Box gap={1} marginTop={1}>
            {state.url && (
              <Button key="open-pr" dimColor={onTerminal} onPress={openUrl(state.url)}>
                Open in GitHub
              </Button>
            )}
            {state.plan && (
              <Button key="open-plan" dimColor={onTerminal} onPress={openUrl(state.plan.file)}>
                Open plan
              </Button>
            )}
            {(state.links ?? []).slice(0, 3).map(l => (
              <Button key={`link:${l.url}`} dimColor={onTerminal} onPress={openUrl(l.url)}>
                {l.label}
              </Button>
            ))}
            <Chip color={kindColor} label={state.kind} />
            {isBuild && <Chip color="warning" label="beta" />}
            {state.complexity && <Chip color={complexityColor(state.complexity)} label={state.complexity} />}
            {state.size && (
              <Box gap={1}>
                <Text color="success">+{state.size.additions}</Text>
                <Text color="error">-{state.size.deletions}</Text>
              </Box>
            )}
            {busy ? (
              <Chip color="warning" label="working…" />
            ) : state.outcome ? (
              <Chip color={outcomeColor(state.outcome.label)} label={state.outcome.label} />
            ) : null}
          </Box>
          {!busy && !state.outcome && (
            <Box marginTop={1}>
              <Text dimColor>{state.verdict}</Text>
            </Box>
          )}
          {state.outcome?.url && !busy && (
            <Box marginTop={1}>
              <Text dimColor>{state.outcome.url}</Text>
            </Box>
          )}
        </Box>

        {picture}

        <Box flexDirection="column">
          <Text dimColor bold>STAGES</Text>
          {state.stages.map(s => {
            const isCurrent = s.state === 'current' || s.state === 'running' || s.state === 'blocked'
            const isPast = s.state === 'done' || s.state === 'skipped'
            const mark = { current: '▶', running: '…', blocked: '!', done: '✓', skipped: '–', pending: '○' }[s.state]
            const markColor = s.state === 'blocked' ? 'error' : s.state === 'running' ? 'warning' : isCurrent ? 'claude' : s.state === 'done' ? 'success' : 'inactive'
            const counts = countsOf(s.name)
            return (
              <Box key={`row:${s.name}`} flexDirection="column">
                <Box gap={1} alignItems="center">
                  <Text backgroundColor={stageColor(s)}> </Text>
                  <Text color={markColor}>{mark}</Text>
                  <Box width={nameWidth}>
                    <Button key={`stage:${s.name}`} dimColor={isPast || (onTerminal && !isCurrent)} onPress={send(`walk-pr: go to ${s.name}`)}>
                      {label(s)}
                    </Button>
                  </Box>
                  {s.state === 'blocked' && <Chip color="error" label="waiting on a decision" />}
                  {counts.fixed > 0 && <Chip color="success" label={`${counts.fixed} fixed`} />}
                  {counts.severe > 0 && <Chip color="error" label={`${counts.severe} severe`} />}
                  {counts.minor > 0 && <Chip color="warning" label={`${counts.minor} minor`} />}
                  {counts.decisions > 0 && <Chip color="claude" label={`${counts.decisions} decision${counts.decisions === 1 ? '' : 's'}`} />}
                </Box>
                {(s.commits ?? []).map((c, i, all) => {
                  const space = c.indexOf(' ')
                  const sha = (space > 0 ? c.slice(0, space) : c).slice(0, 7)
                  const title = space > 0 ? c.slice(space + 1) : ''
                  return (
                    <Box key={`commit:${s.name}:${c}`} paddingLeft={4} gap={1}>
                      <Text dimColor>{i === all.length - 1 ? '└─' : '├─'}</Text>
                      <Box width={8}>
                        <Text color="claude">{sha}</Text>
                      </Box>
                      <Text dimColor wrap="truncate-end">{title}</Text>
                    </Box>
                  )
                })}
              </Box>
            )
          })}
        </Box>

        {state.findings.length > 0 && (
          <Box flexDirection="column">
            <Text dimColor bold>
              {isBuild
                ? closed
                  ? 'DECISIONS AND FINDINGS'
                  : state.isFinished
                    ? 'DECISIONS · every one needs a pick before the plan is approved'
                    : 'DECISIONS'
                : closed
                  ? 'FINDINGS'
                  : state.isFinished
                    ? 'FINDINGS · raised ones go into the review'
                    : 'CONCERNS'}
            </Text>
            {[...state.findings].sort((a, b) => Number(isHere(b)) - Number(isHere(a))).map(f => {
              const tone = f.label === 'issue' ? 'error' : f.label === 'pre-existing' ? 'inactive' : f.options ? 'claude' : 'warning'
              const chosenLabel = f.options && f.chosen !== undefined ? f.options[f.chosen]?.label : undefined
              return (
                <Box
                  key={`finding:${f.n}`}
                  flexDirection="column"
                  marginTop={1}
                  paddingX={1}
                  borderStyle="round"
                  borderColor={f.resolution === 'fixed' || chosenLabel ? 'success' : f.decision === 'raise' ? 'error' : f.decision === 'drop' ? 'inactive' : tone}
                  borderDimColor={f.decision === 'drop'}
                >
                  <Box gap={1}>
                    <Chip color={tone} label={f.label} />
                    {chosenLabel && <Chip color="success" label={chosenLabel} />}
                    {f.isUnverified && <Chip color="inactive" label="unverified" />}
                    {f.raisedBy && <Chip color="claude" label={`raised by ${f.raisedBy}`} />}
                    {f.resolution === 'fixed' && <Chip color="success" label="Fixed" />}
                    {f.resolution === 'partial' && <Chip color="warning" label="Partially fixed" />}
                    {f.thread && <Chip color="claude" label={f.thread.isResolved ? 'Thread · resolved' : `Thread · ${f.thread.replies} ${f.thread.replies === 1 ? 'reply' : 'replies'}`} />}
                    <Text dimColor>#{f.n}</Text>
                    {f.stage && isHere(f) && <Chip color="claude" label={f.stage} />}
                    {f.stage && !isHere(f) && (
                      <Button key={`goto:${f.n}`} dimColor onPress={send(`walk-pr: go to ${f.stage}`)}>
                        {f.stage}
                      </Button>
                    )}
                  </Box>
                  <Text dimColor={f.decision === 'drop'}>{f.text}</Text>
                  {whereUrls.has(f.n) ? (
                    <Button key={`where:${f.n}`} dimColor onPress={openUrl(whereUrls.get(f.n)!)}>
                      {f.where}
                    </Button>
                  ) : (
                    <Text dimColor italic>{f.where}</Text>
                  )}
                  {f.options && (
                    <Box flexDirection="column" marginTop={1}>
                      {f.options.map((o, i) => (
                        <Box key={`option:${f.n}:${i}`} gap={1} alignItems="center">
                          <Box width={Math.max(...f.options!.map(x => x.label.length)) + 6}>
                            <Button
                              key={`choose:${f.n}:${i}`}
                              variant={f.chosen === i ? 'primary' : o.isRecommended && f.chosen === undefined ? 'primary' : 'secondary'}
                              onPress={closed ? () => undefined : choose(f.n, i)}
                            >
                              {f.chosen === i ? `✓ ${o.label}` : o.label}
                            </Button>
                          </Box>
                          {o.isRecommended && f.chosen === undefined && <Chip color="success" label="recommended" />}
                          {o.note && <Text dimColor>{o.note}</Text>}
                        </Box>
                      ))}
                    </Box>
                  )}
                  {state.isFinished && f.comment && f.decision === 'raise' && (
                    <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="single" borderColor="inactive" borderDimColor>
                      <Text dimColor italic>{closed ? 'Posted comment' : 'Comment draft'}</Text>
                      <Text>{f.comment}</Text>
                      {!closed && (
                        <Box marginTop={1}>
                          <Button key={`edit-comment:${f.n}`} onPress={fill(`walk-pr: edit comment ${f.n}: `)}>
                            Edit comment
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                  {f.thread && f.reply && (
                    <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="single" borderColor="claude" borderDimColor>
                      <Text dimColor italic>Reply draft · to {f.thread.lastBy}</Text>
                      <Text>{f.reply}</Text>
                      <Box marginTop={1}>
                        <Button key={`edit-reply:${f.n}`} onPress={fill(`walk-pr: edit reply ${f.n}: `)}>
                          Edit reply
                        </Button>
                      </Box>
                    </Box>
                  )}
                  {f.thread && (
                    <Box gap={1} marginTop={1}>
                      <Button key={`thread:${f.n}`} onPress={send(`walk-pr: show thread ${f.n}`)}>
                        View reply
                      </Button>
                      {f.reply && (
                        <Button key={`reply:${f.n}`} variant="primary" onPress={send(`walk-pr: reply finding ${f.n}`)}>
                          Post reply
                        </Button>
                      )}
                      {!f.thread.isResolved && (
                        <Button key={`resolve:${f.n}`} onPress={send(`walk-pr: resolve finding ${f.n}`)}>
                          Resolve
                        </Button>
                      )}
                    </Box>
                  )}
                  {closed && f.posted && !f.raisedBy && !f.options && <Box marginTop={1}>{decisionChip(f.decision)}</Box>}
                  {closed && !f.posted && !f.raisedBy && !f.options && (
                    <Box gap={1} marginTop={1}>
                      <Button
                        key={`raise:${f.n}`}
                        variant={f.decision === 'raise' ? 'primary' : 'secondary'}
                        onPress={decide(f.n, 'raise')}
                      >
                        {f.decision === 'raise' ? `✓ ${raiseLabel}` : raiseLabel}
                      </Button>
                      <Button
                        key={`drop:${f.n}`}
                        variant={f.decision === 'drop' ? 'primary' : 'secondary'}
                        onPress={decide(f.n, 'drop')}
                      >
                        {f.decision === 'drop' ? `✓ ${dropLabel}` : dropLabel}
                      </Button>
                    </Box>
                  )}
                  {!closed && (
                  <Box gap={1} marginTop={1}>
                    {!f.raisedBy && !f.options && (
                      <Button
                        key={`raise:${f.n}`}
                        variant={f.decision === 'raise' ? 'primary' : 'secondary'}
                        onPress={decide(f.n, 'raise')}
                      >
                        {f.decision === 'raise' ? `✓ ${raiseLabel}` : raiseLabel}
                      </Button>
                    )}
                    {!f.raisedBy && !f.options && (
                      <Button
                        key={`drop:${f.n}`}
                        variant={f.decision === 'drop' ? 'primary' : 'secondary'}
                        onPress={decide(f.n, 'drop')}
                      >
                        {f.decision === 'drop' ? `✓ ${dropLabel}` : dropLabel}
                      </Button>
                    )}
                    <Button key={`explain:${f.n}`} onPress={send(`walk-pr: explain finding ${f.n}`)}>
                      Explain more
                    </Button>
                  </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        )}

        {state.prompts.length > 0 && (
          <Box flexDirection="column">
            <Text dimColor bold>ASK</Text>
            {state.prompts.map((p, i) => (
              <Box key={`ask:${i}`} gap={1}>
                <Text color="claude">›</Text>
                <Button key={`prompt:${i}`} dimColor={onTerminal} onPress={send(p)}>
                  {p}
                </Button>
              </Box>
            ))}
          </Box>
        )}

        {state.isFinished && !closed && !isBuild && unseen.length > 0 && (
          <Text color="warning">
            {unseen.length} of {state.stages.length} stages not shown: {unseen.map(s => s.name).join(', ')}
          </Text>
        )}
        {state.isFinished && !closed && isBuild && undecided.length > 0 && (
          <Text color="warning">
            {undecided.length} decision{undecided.length === 1 ? '' : 's'} still open: {undecided.map(f => `#${f.n}`).join(', ')}
          </Text>
        )}
        <Box gap={1} flexWrap="wrap" marginTop={1}>
          {closed && (
            <Button key="resume" variant="primary" onPress={send('walk-pr: resume')}>
              Resume tour
            </Button>
          )}
          {closed && !isBuild && (
            <Button key="refresh" onPress={send('walk-pr: refresh')}>
              Check PR for updates
            </Button>
          )}
          {closed && isBuild && state.url && (
            <Box borderStyle="round" borderColor="claude" padding={0}>
              <Button key="review-round" onPress={send('walk-pr: review round')}>
                Another review round
              </Button>
            </Box>
          )}
          {closed && !isBuild && state.findings.some(f => !f.posted && f.decision === 'raise') && (
            <Button key="post-raised" variant="primary" onPress={send('walk-pr: review comment')}>
              Post raised
            </Button>
          )}
          {closed && !isBuild && canApproveAfterOutcome && (
            <Box borderStyle="round" borderColor="success" padding={0}>
              <Button key="approve-after" variant={allAddressed ? 'primary' : 'secondary'} onPress={send('walk-pr: review approve')}>
                Approve
              </Button>
            </Box>
          )}
          {state.isFinished && !closed && isBuild && (
            <Box borderStyle="round" borderColor="success" padding={0}>
              <Button key="approve-plan" onPress={send('walk-pr: approve plan')}>
                Approve plan
              </Button>
            </Box>
          )}
          {state.isFinished && !closed && isBuild && (
            <Button key="revise-plan" onPress={fill('walk-pr: revise plan: ')}>
              Revise plan
            </Button>
          )}
          {state.isFinished && !closed && isBuild && (
            <Button key="stop-plan" dimColor onPress={send('walk-pr: done')}>
              Stop here
            </Button>
          )}
          {state.isFinished && !closed && !isBuild && (
            <Box borderStyle="round" borderColor="success" padding={0}>
              <Button key="approve" onPress={send('walk-pr: review approve')}>
                Approve
              </Button>
            </Box>
          )}
          {state.isFinished && !closed && !isBuild && (
            <Box borderStyle="round" borderColor="error" padding={0}>
              <Button key="request-changes" onPress={send('walk-pr: review request-changes')}>
                Request changes
              </Button>
            </Box>
          )}
          {state.isFinished && !closed && !isBuild && (
            <Box borderStyle="round" borderColor="text" padding={0}>
              <Button key="comment" onPress={send('walk-pr: review comment')}>
                Comment
              </Button>
            </Box>
          )}
          {state.isFinished && !closed && !isBuild && (
            <Button key="done" dimColor onPress={send('walk-pr: done')}>
              Done without posting
            </Button>
          )}
          {!state.isFinished && (
            <Button key="next" variant="primary" hotkey="n" onPress={send('walk-pr: next')}>
              {state.nextLabel ? `Next: ${state.nextLabel}` : 'Next'}
            </Button>
          )}
          {!state.isFinished && (
            <Button key="finish" hotkey="f" onPress={send('walk-pr: finish')}>
              Finish now
            </Button>
          )}
        </Box>
      </Box>
    )
  })
}
