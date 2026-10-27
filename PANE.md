# Pane

Side pane for the tour skill. The skill pushes the tour state through the tool
`mcp__walk-pr__set`; the pane draws the stages, the current stage's findings, contextual
prompts, and Next / Finish. Every button calls `$.prompt.submit` with `asUser`, so a click sends
the message straight away without touching the prompt box.

Protocol the buttons speak (same as `skills/tour/widgets.md`):

- `walk-pr: go to <stage name>`
- `walk-pr: next`, `walk-pr: finish`, `walk-pr: done`
- `walk-pr: review approve|request-changes|comment`
- `walk-pr: finding <n> raise|drop`
- `walk-pr: explain finding <n>`
- a contextual prompt's own text

Raise, Drop and an option pick are held in the pane as pending decisions and ride along on
the next message, as the suffix `(findings: 1 raise, 3 option 2)` on a click or as hidden
context on a typed message; after that the next `set` call is the record.

Build mode (`mode: "build"`, from `skills/build/SKILL.md`): findings carry `options`, drawn
as one button each with the recommended one primary until a pick; Raise and Drop read Fix
and Skip; stages may be `running` or `blocked` and list their `commits`; `plan.file` adds an
Open plan button; the finish draws Approve plan, Revise plan (fills the composer with
`walk-pr: revise plan: `) and Stop here.

- `walk-pr: approve plan`, `walk-pr: show plan`
- `walk-pr: finding <n> option <k>` (typed form of a pick)

`/walk-pr-pane` reopens the pane after it was closed; it also reopens itself when a session with a tour starts.


Note: on the desktop app a `plain` Button needs a focusing click before it presses, so every
button here is a real one.
- `walk-pr: resume`, `walk-pr: refresh`, `walk-pr: review approve` (after the outcome is shown; Approve stays until the outcome is Approved, Merged or Closed)

Known host limit: after switching to another session and back, the first click in the pane only
focuses its web view and is swallowed; the mod receives no event for it. Clicks within one session
after a tour message press on the first click.
