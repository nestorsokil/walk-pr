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
- `walk-pr: verify finding <n>` (Verify, on a finding that carries `verify`; the skill runs it
  in a background agent and reports back through `verification`)
- a contextual prompt's own text

At the finish in tour mode, `reviewBody` is drawn above the findings as the review comment.
Its Edit comment button fills the composer with `walk-pr: edit review body: `. The same text
is posted as the review body with any of the three verdicts.

Raise, Drop and an option pick are held in the pane as pending decisions and ride along on
the next message, as the suffix `(findings: 1 raise, 3 option 2)` on a click or as hidden
context on a typed message; after that the next `set` call is the record.

Stage rows, in both modes: a click on a stage's name opens and closes it; rows start closed.
An open row also holds the cards of the findings whose `stage` is that stage, decisions
included, with their buttons; the list under the stages keeps only the findings with no
stage. A tour's finish is the exception: it lists every finding under the stages, for the
review. Criteria stay in their own section.
An open row shows the stage's `summary` (Markdown), its `diagram` (`svg`, a path to a
standalone SVG file, drawn with the `Svg` element and `isInteractive` off the terminal, so
CSS and SMIL animation and hover run and script does not; `file`, a PNG, drawn
with `Image` on a terminal; the `alt` text when neither draws), Explain more
(`walk-pr: go to <stage name>`) and Ack. Ack is held in the pane and rides along on the next
message as `(stages: <name> ack, <name> unack)`, joined to the findings suffix with `; `. A
`set` keeps a stage's ack unless it sends `isAcked` for that stage. At the finish the pane
names the stages not acked. The mark before a stage's name shows the ack (`✓` or `○`); a
build run shows `…` on the running stage and `!` on a blocked one. There is no Next button
and no current-stage mark; `walk-pr: next` is still accepted when typed.

Build mode (`mode: "build"`, from `skills/build/SKILL.md`): findings carry `options`, drawn
as one button each with the recommended one primary until a pick; Raise and Drop read Fix
and Skip; stages may be `running` or `blocked` and list their `commits`; `plan.file` adds an
Open plan button; a finding with `label: criterion` is an acceptance criterion, drawn with
no Fix and Skip, and its `verification` reads proven (`confirmed`), not met (`refuted`) or
not verified (`inconclusive`), with a not-met one counted as severe on its stage; its
`verify` line is drawn as plain text ("Proof: ...") with no Verify button, and until the run
starts it has Edit (fills the composer with `walk-pr: edit criterion <n>: `) and Drop (a
pending `drop`, or `later` when pressed again); criteria and decisions each sit in a
section that opens and closes with a click on its heading and starts closed; the criteria
section sits above the stages in an outlined box, the decisions section below them; the
finish draws Run, Run in VS Code, Revise plan (fills the composer with
`walk-pr: revise plan: `) and Stop here.

- `walk-pr: approve plan` (Run), `walk-pr: show plan`
- `walk-pr: approve plan in editor` (Run in VS Code: the implementer runs as a session in
  the editor, and Resume build continues from there)
- `walk-pr: review round` (Another review round, after the PR outcome in build mode)
- `walk-pr: finding <n> option <k>` (typed form of a pick)

`/walk-pr-pane` reopens the pane after it was closed; it also reopens itself when a session with a tour starts.


Note: on the desktop app a `plain` Button needs a focusing click before it presses, so every
button here is a real one.
- `walk-pr: resume`, `walk-pr: refresh`, `walk-pr: review approve` (after the outcome is shown; Approve stays until the outcome is Approved, Merged or Closed)

Known host limit: after switching to another session and back, the first click in the pane only
focuses its web view and is swallowed; the mod receives no event for it. Clicks within one session
after a tour message press on the first click.
