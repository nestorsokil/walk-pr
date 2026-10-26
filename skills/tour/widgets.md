# walk-pr widgets

Templates for `show_widget`. Each is the whole `widget_code`. Prose never goes inside a widget;
it goes in the message around it. Every button that needs Claude calls `sendPrompt(...)` and its
label ends with ` ↗`. The prompt strings below are the protocol: the skill parses them from the
next user message, so keep them exactly.

Prompt strings:

| Click | Sends |
|---|---|
| Stage row or pill | `walk-pr: go to <stage name>` |
| Start | `walk-pr: go to <Problem stage name>` |
| Next | `walk-pr: next` |
| Contextual prompt | the prompt text itself, e.g. `Explain the case-insensitive decode` |
| Finish now | `walk-pr: finish` |
| Finding decision | `walk-pr: finding <n> <raise|drop|later>` |
| Finding Explain more | `walk-pr: explain finding <n>` |
| Verdict | `walk-pr: review approve`, `walk-pr: review request-changes`, `walk-pr: review comment` |
| Done without posting | `walk-pr: done` |
| Resume tour | `walk-pr: resume` |
| Check PR for updates | `walk-pr: refresh` |
| Post raised (after the outcome) | `walk-pr: review comment` with only the findings not yet posted |
| Edit comment | fills the composer with `walk-pr: edit comment <n>: ` for the reader to finish |
| Edit reply | fills the composer with `walk-pr: edit reply <n>: ` for the reader to finish |
| View reply | `walk-pr: show thread <n>` |
| Post reply | `walk-pr: reply finding <n>` |
| Resolve | `walk-pr: resolve finding <n>` |
| Diagram node | `walk-pr: explain <node name>` |

Call `read_me` with modules `["diagram", "interactive"]` once per session before the first
widget.

## Stage roles

Every stage carries a one-word `role` prefix before its name, in muted text: Problem, Solution,
Mechanism, Boundary, Data, Rollout, Risk, Cleanup. Navigation still sends the bare name.

## Stage colours

Colour is a function of the role, fixed across tours. Light-mode stops from the visualize
palette; the same ramp class works on SVG nodes.

| Role | Ramp | Fill | Text | SVG class |
|---|---|---|---|---|
| Problem | coral | #FAECE7 | #712B13 | c-coral |
| Solution | purple | #EEEDFE | #3C3489 | c-purple |
| Mechanism, Boundary, Data | teal | #E1F5EE | #085041 | c-teal |
| Rollout, Risk, Cleanup | blue | #E6F1FB | #0C447C | c-blue |

Define one CSS class per ramp used (`.wp-coral` and so on, see template 1) and reuse it in
template 3. Dark mode: the widget host flips `--surface-*` and `--text-*`, but these fills are
fixed, so add the dark override shown in template 1.

## 1. Verdict and menu

Rows are clickable. `data-state` is `pending`, `current`, `done`, or `skipped`. A click on any
row jumps straight there. The dot on each row is the stage's area ramp. Kind badge ramp: bug fix =
coral, feature = teal, refactor = purple. Concerns badge: amber when > 0, gray when 0.

```html
<h2 class="sr-only">PR verdict with a clickable list of named tour stages</h2>
<style>
.wp-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border:0.5px solid var(--border);border-radius:var(--radius);cursor:pointer;margin:0 0 6px}
.wp-row:hover{border-color:var(--border-strong);background:var(--surface-1)}
.wp-row[data-state=current]{border:2px solid var(--border-accent)}
.wp-row[data-state=done] .wp-name,.wp-row[data-state=skipped] .wp-name{color:var(--text-muted)}
.wp-dot{width:12px;height:12px;border-radius:50%;flex:none;border:0.5px solid var(--border-strong)}
.wp-name{font-size:14px;flex:1}
.wp-tag{font-size:12px;padding:2px 8px;border-radius:var(--radius)}
.wp-purple{background:#EEEDFE;color:#3C3489}.wp-teal{background:#E1F5EE;color:#085041}.wp-coral{background:#FAECE7;color:#712B13}
[data-mode=dark] .wp-purple{background:#3C3489;color:#CECBF6}[data-mode=dark] .wp-teal{background:#085041;color:#9FE1CB}[data-mode=dark] .wp-coral{background:#712B13;color:#F5C4B3}
</style>
<div style="font-size:18px;font-weight:500;margin:0 0 4px">fix(alerting): surface and reject channel configs the sender cannot read</div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 1rem">
  <span class="wp-tag wp-coral">bug fix</span>
  <span class="wp-tag" style="background:var(--surface-1);color:var(--text-secondary)">medium · 3 concepts</span>
  <span class="wp-tag" style="background:var(--bg-warning);color:var(--text-warning)">3 concerns</span>
</div>
<div class="wp-row" data-state="pending" onclick="sendPrompt('walk-pr: go to Silent webhook drop')"><span class="wp-dot wp-teal"></span><span class="wp-name">Problem: Silent webhook drop</span></div>
<div class="wp-row" data-state="pending" onclick="sendPrompt('walk-pr: go to Reject and count')"><span class="wp-dot wp-teal"></span><span class="wp-name">Approach: Reject and count</span></div>
<div class="wp-row" data-state="pending" onclick="sendPrompt('walk-pr: go to Count the give-ups')"><span class="wp-dot wp-teal"></span><span class="wp-name">Count the give-ups</span><span class="wp-tag" style="background:var(--bg-warning);color:var(--text-warning)">1 concern</span></div>
<div class="wp-row" data-state="pending" onclick="sendPrompt('walk-pr: go to Reject bad keys')"><span class="wp-dot wp-purple"></span><span class="wp-name">Reject bad keys</span><span class="wp-tag" style="background:var(--bg-warning);color:var(--text-warning)">2 concerns</span></div>
<div class="wp-row" data-state="pending" onclick="sendPrompt('walk-pr: go to Repair production')"><span class="wp-dot wp-purple"></span><span class="wp-name">Repair production</span></div>
<div style="display:flex;gap:8px;margin:1rem 0 0">
  <button type="button" onclick="sendPrompt('walk-pr: go to Silent webhook drop')">Start ↗</button>
  <button type="button" onclick="sendPrompt('walk-pr: finish')">Finish now ↗</button>
</div>
```

## 2. Diagram

SVG per the visualize diagram rules: `viewBox="0 0 680 H"`, `role="img"` with `<title>` and
`<desc>`, the arrow marker in `<defs>`, `class="t|ts|th"` on every text, `c-<ramp>` on nodes.
Every node is `<g class="node" onclick="sendPrompt('walk-pr: explain <name>')">`. A node takes
the ramp of its area, the same one its stage uses in the menu. Nodes outside any stage's area are
`c-gray`. The failing node (Problem) is `c-red` with a subtitle "expected X, got Y". A changed or
new node (Approach) keeps its area ramp and gets a subtitle naming the change plus a 1px stroke.
Edge labels carry the concrete input travelling the path. At most 8 nodes.

```html
<svg width="100%" viewBox="0 0 680 150" role="img">
<title>Request path with the failing step marked</title>
<desc>A channel config is saved through the settings API and read by the sender, which drops it.</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="node c-gray" onclick="sendPrompt('walk-pr: explain Config client')"><rect x="40" y="40" width="170" height="56" rx="8" stroke-width="0.5"/><text class="th" x="125" y="58" text-anchor="middle" dominant-baseline="central">Config client</text><text class="ts" x="125" y="78" text-anchor="middle" dominant-baseline="central">saves webhook URL</text></g>
<line x1="210" y1="68" x2="250" y2="68" class="arr" marker-end="url(#arrow)"/>
<g class="node c-purple" onclick="sendPrompt('walk-pr: explain Settings API')"><rect x="255" y="40" width="170" height="56" rx="8" stroke-width="0.5"/><text class="th" x="340" y="58" text-anchor="middle" dominant-baseline="central">Settings API</text><text class="ts" x="340" y="78" text-anchor="middle" dominant-baseline="central">accepts it</text></g>
<line x1="425" y1="68" x2="465" y2="68" class="arr" marker-end="url(#arrow)"/>
<g class="node c-red" onclick="sendPrompt('walk-pr: explain Sender')"><rect x="470" y="40" width="170" height="56" rx="8" stroke-width="0.5"/><text class="th" x="555" y="58" text-anchor="middle" dominant-baseline="central">Sender</text><text class="ts" x="555" y="78" text-anchor="middle" dominant-baseline="central">expected a send, got a drop</text></g>
</svg>
```

## 3. Checkpoint

Named pills across the top in their area colours, then the stage's findings (omit the block when
none), then up to five contextual prompt buttons, then the fixed Next and Finish buttons.
`data-state` on pills as in template 1; `current` gets the accent ring on top of its colour.
Reuse the `.wp-<ramp>` classes from template 1.

```html
<h2 class="sr-only">Tour progress with findings for this stage, suggested follow-ups, and navigation</h2>
<style>
.wp-pills{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 1rem}
.wp-pill{height:28px;padding:0 12px;border-radius:14px;border:0.5px solid transparent;display:flex;align-items:center;font-size:13px;cursor:pointer}
.wp-pill:hover{border-color:var(--border-strong)}
.wp-pill[data-state=current]{box-shadow:0 0 0 2px var(--border-accent);font-weight:500}
.wp-pill[data-state=done]{opacity:.6}
.wp-pill[data-state=skipped]{opacity:.6;text-decoration:line-through}
.wp-purple{background:#EEEDFE;color:#3C3489}.wp-teal{background:#E1F5EE;color:#085041}.wp-coral{background:#FAECE7;color:#712B13}
[data-mode=dark] .wp-purple{background:#3C3489;color:#CECBF6}[data-mode=dark] .wp-teal{background:#085041;color:#9FE1CB}[data-mode=dark] .wp-coral{background:#712B13;color:#F5C4B3}
.wp-find{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:0.5px solid var(--border);border-radius:var(--radius);margin:0 0 6px}
.wp-find-label{font-size:12px;padding:2px 8px;border-radius:var(--radius);flex:none}
.wp-find-text{font-size:14px;flex:1;line-height:1.5}
.wp-find-acts{display:flex;gap:4px;flex:none}
.wp-find-acts button{padding:4px 8px;font-size:12px;height:auto}
.wp-ask{display:flex;gap:8px;flex-wrap:wrap;margin:1rem 0 0}
.wp-nav{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 0;padding-top:12px;border-top:0.5px solid var(--border)}
</style>
<div class="wp-pills">
  <span class="wp-pill wp-coral" data-state="done" onclick="sendPrompt('walk-pr: go to Silent webhook drop')"><span style="opacity:.7">Problem:</span>&nbsp;Silent webhook drop</span>
  <span class="wp-pill wp-purple" data-state="done" onclick="sendPrompt('walk-pr: go to Reject and count')"><span style="opacity:.7">Solution:</span>&nbsp;Reject and count</span>
  <span class="wp-pill wp-teal" data-state="current" onclick="sendPrompt('walk-pr: go to Count the give-ups')"><span style="opacity:.7">Mechanism:</span>&nbsp;Count the give-ups</span>
  <span class="wp-pill wp-teal" data-state="pending" onclick="sendPrompt('walk-pr: go to Reject bad keys')"><span style="opacity:.7">Boundary:</span>&nbsp;Reject bad keys</span>
  <span class="wp-pill wp-teal" data-state="pending" onclick="sendPrompt('walk-pr: go to Repair production')"><span style="opacity:.7">Data:</span>&nbsp;Repair production</span>
</div>
<div class="wp-find">
  <span class="wp-find-label" style="background:var(--bg-warning);color:var(--text-warning)">question</span>
  <span class="wp-find-text">The completeness test only checks that the counter exists, not that a dropped message increments it.</span>
  <span class="wp-find-acts">
    <button type="button" onclick="sendPrompt('walk-pr: finding 1 raise')">Raise ↗</button>
    <button type="button" onclick="sendPrompt('walk-pr: finding 1 drop')">Drop ↗</button>
  </span>
</div>
<div class="wp-ask">
  <button type="button" onclick="sendPrompt('Explain what a give-up record is')">Explain what a give-up record is ↗</button>
  <button type="button" onclick="sendPrompt('Verify the test fails without the fix')">Verify the test fails without the fix ↗</button>
  <button type="button" onclick="sendPrompt('Walk one dropped alert through the new path')">Walk one dropped alert through ↗</button>
</div>
<div class="wp-nav">
  <button type="button" onclick="sendPrompt('walk-pr: next')">Next: Reject bad keys ↗</button>
  <button type="button" onclick="sendPrompt('walk-pr: finish')">Finish now ↗</button>
</div>
```

The Next button names the stage it leads to. On the last stage it reads "Finish ↗" and sends
`walk-pr: finish`.

## 4. Finish

All findings with their current decision, one row each, and the two closing actions. Decision
badge: `raise` = danger tint, `drop` = gray, `later` = warning tint; a finding with
`isUnverified` adds a second surface-1 badge "unverified" after its label.
Undecided rows keep their buttons; decided rows show the decision and a small "Change ↗" that
sends the opposite decision. The location line names the stage, not a number.

```html
<h2 class="sr-only">All review findings with their decisions and closing actions</h2>
<style>
.wp-find{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:0.5px solid var(--border);border-radius:var(--radius);margin:0 0 6px}
.wp-find-label{font-size:12px;padding:2px 8px;border-radius:var(--radius);flex:none;min-width:48px;text-align:center}
.wp-find-text{font-size:14px;flex:1;line-height:1.5}
.wp-find-where{font-size:12px;color:var(--text-muted);display:block}
.wp-find-acts{display:flex;gap:4px;flex:none;align-items:center}
.wp-find-acts button{padding:4px 8px;font-size:12px;height:auto}
</style>
<div class="wp-find">
  <span class="wp-find-label" style="background:var(--bg-danger);color:var(--text-danger)">raise</span>
  <span class="wp-find-text">The completeness test does not exercise a dropped message.<span class="wp-find-where">Count the give-ups · notifier/consumer_test.go:88</span></span>
  <span class="wp-find-acts"><button type="button" onclick="sendPrompt('walk-pr: finding 1 drop')">Change ↗</button></span>
</div>
<div class="wp-find">
  <span class="wp-find-label" style="background:var(--bg-warning);color:var(--text-warning)">later</span>
  <span class="wp-find-text">The production repair must run before the API change deploys, and the PR body says the opposite.<span class="wp-find-where">Repair production · PR body</span></span>
  <span class="wp-find-acts">
    <button type="button" onclick="sendPrompt('walk-pr: finding 2 raise')">Raise ↗</button>
    <button type="button" onclick="sendPrompt('walk-pr: finding 2 drop')">Drop ↗</button>
  </span>
</div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin:1rem 0 0">
  <button type="button" onclick="sendPrompt('walk-pr: review approve')">✓ Approve ↗</button>
  <button type="button" onclick="sendPrompt('walk-pr: review request-changes')">✗ Request changes ↗</button>
  <button type="button" onclick="sendPrompt('walk-pr: review comment')">Comment ↗</button>
  <button type="button" onclick="sendPrompt('walk-pr: done')">Done without posting ↗</button>
</div>
```

## 5. Overview card

Read-only. Rendered once at Phase 2, before the menu. Top-down: a chip row (kind, CI,
dependencies), the verdict line, the services-touched row, before and after in one box each,
the "What this PR includes" list (one bullet per concept stage, in menu order, Problem and
Solution left out), the high-level diagram of the change (an inline SVG per template 2, at most 6 nodes, inside the
card), and the colour legend under it. Without the pane, the stage strip (area colour, one
clause each) sits between the verdict and the services row. No findings, no buttons; the pane or
template 1 carries the menu.

Services row: `flex` is the square root of the service's changed lines, floored at 15% of the
row, so one box never dwarfs the rest. Every box keeps `min-width:0`, `flex-basis:0` and
`box-sizing:border-box`, and nothing in the row gets a fixed width or margin, so the last box
never runs past the card edge; a long name truncates with an ellipsis. One background per service from the palette below. The
bottom strip's filled width is the share of changed lines outside test files.

| service palette | background | text |
| --- | --- | --- |
| 1 | `#3C3489` | `#CECBF6` |
| 2 | `#0F5A4B` | `#BFECD9` |
| 3 | `#1E4C78` | `#C6E0F7` |
| 4 | `#6B4A12` | `#F3DDA6` |
| 5 | `#712B13` | `#F7C9B7` |
| 6 | `#4A4A48` | `#D3D1C7` |

State chip: `st-draft` (Draft, Closed), plain (Ready), `st-ok` (Approved), `st-bad`
(Changes requested, Conflicts), `st-merged` (Merged). Chip and legend colours are light-mode
values with a `[data-mode=dark]` override, as in templates 1 and 3; the service boxes carry
their own dark background and need none. CI chip: `ci-ok` with `CI ✓ passed/total`,
`ci-fail` with `CI ✗` and the failing check names, `ci-run` with `CI running`. Dependency chips
are `<a>` links to the PR: `waits on #n`, `follow-up to #n`.

The example leaves out the diagram for brevity; a real card has it, with its legend, after the
before/after boxes.

```html
<h2 class="sr-only">Tour overview: verdict, services touched, before and after, change diagram</h2>
<style>
.wf-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 6px;font-size:12px}
.wf-top span{padding:2px 8px;border-radius:var(--radius);border:0.5px solid var(--border);color:var(--text-secondary)}
.wf-top .kind{background:var(--bg-danger);color:var(--text-danger);border-color:transparent}
.wf-top a{text-decoration:none}
.wf-top .st-draft{color:var(--text-muted)}
.wf-top .st-ok,.wf-top .ci-ok{color:#085041;border-color:#9FE1CB}
.wf-top .st-bad,.wf-top .ci-fail{color:#712B13;border-color:#F5C4B3}
.wf-top .st-merged{color:#3C3489;border-color:#CECBF6}
.wf-top .ci-run{color:#6B4A12;border-color:#F3DDA6}
[data-mode=dark] .wf-top .st-ok,[data-mode=dark] .wf-top .ci-ok{color:#5FD79A;border-color:#2E6B4F}
[data-mode=dark] .wf-top .st-bad,[data-mode=dark] .wf-top .ci-fail{color:#F28B6C;border-color:#7A3A26}
[data-mode=dark] .wf-top .st-merged{color:#CECBF6;border-color:#5B52B8}
[data-mode=dark] .wf-top .ci-run{color:#F3DDA6;border-color:#6B4A12}
.wf-verdict{font-size:15px;font-weight:500;margin:0 0 12px}
.wf-label{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);margin:0 0 6px}
.wf-svc{display:flex;gap:6px;margin:0 0 6px;height:58px;width:100%;box-sizing:border-box;overflow:hidden}
.wf-svc>div{position:relative;min-width:0;flex-basis:0;box-sizing:border-box;border-radius:var(--radius);padding:6px 10px 0;font-size:13px;line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.wf-svc b{display:block;font-weight:500}
.wf-svc span{font-size:12px}
.wf-svc .add{color:#5FD79A}.wf-svc .del{color:#F28B6C}
.wf-svc .bar{position:absolute;left:0;right:0;bottom:0;height:12px;background:rgba(0,0,0,.35)}
.wf-svc .bar i{position:absolute;left:0;top:0;bottom:0;background:rgba(255,255,255,.55)}
.wf-svc .bar em{position:absolute;right:6px;top:-1px;font-style:normal;font-size:10px;color:rgba(255,255,255,.85)}
.wf-note{font-size:12px;color:var(--text-secondary);margin:0 0 14px}
.wf-note i{display:inline-block;width:12px;height:6px;background:rgba(128,128,128,.55);border:0.5px solid var(--border);vertical-align:middle;margin-right:5px}
.wf-ba{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 14px}
.wf-ba>div{padding:8px 10px;border:0.5px solid var(--border);border-radius:var(--radius);font-size:13px;line-height:1.45}
.wf-ba b{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);margin:0 0 2px}
.wf-inc{margin:0 0 14px;padding:0 0 0 18px;font-size:13px;line-height:1.5}
.wf-inc li{margin:0 0 2px}
.wf-legend{display:flex;gap:16px;font-size:12px;color:var(--text-secondary);margin:4px 0 0}
.wf-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:5px;border:0.5px solid}
.wf-legend .lg-gray{background:#F1F0EC;border-color:#888780}.wf-legend .lg-purple{background:#EEEDFE;border-color:#7F77DD}.wf-legend .lg-coral{background:#FAECE7;border-color:#D85A30}
[data-mode=dark] .wf-legend .lg-gray{background:#2C2C2A}[data-mode=dark] .wf-legend .lg-purple{background:#3C3489}[data-mode=dark] .wf-legend .lg-coral{background:#712B13}
@media (max-width:520px){.wf-ba{grid-template-columns:1fr}}
</style>
<div class="wf-top"><span class="kind">bug fix</span><span>Ready</span><span class="ci-ok">CI ✓ 14/14</span><a href="https://github.com/acme/repo/pull/98"><span>follow-up to #98</span></a></div>
<div class="wf-verdict">Sound fix at the cause. 1 finding worth raising.</div>
<div class="wf-label">Services touched</div>
<div class="wf-svc">
  <div style="flex:52;background:#3C3489;color:#CECBF6"><b>settings-api</b><span class="add">+780</span> <span class="del">−120</span><div class="bar"><i style="width:38%"></i><em>38% code</em></div></div>
  <div style="flex:18;background:#0F5A4B;color:#BFECD9"><b>attributes</b><span class="add">+40</span> <span class="del">−0</span><div class="bar"><i style="width:100%"></i><em>all code</em></div></div>
  <div style="flex:15;background:#1E4C78;color:#C6E0F7"><b>notifier</b><span class="add">+12</span> <span class="del">−17</span><div class="bar"><i style="width:52%"></i><em>52%</em></div></div>
</div>
<div class="wf-note"><i></i>share of changed lines outside test files</div>
<div class="wf-ba">
  <div><b>Before</b>A bad key saved fine and every alert to it vanished silently.</div>
  <div><b>After</b>The save is refused and a dropped alert increments a counter.</div>
</div>
<div class="wf-label">What this PR includes</div>
<ul class="wf-inc">
  <li><b>Count the give-ups</b>: a dropped alert becomes a failed delivery the operator can see.</li>
  <li><b>Reject bad keys</b>: a channel config the sender cannot read is refused when saved.</li>
  <li><b>Repair production</b>: channels already saved with a bad key are fixed in place.</li>
</ul>
<!-- the change diagram (template 2, at most 6 nodes) goes here -->
<div class="wf-legend"><span><i class="lg-gray"></i>Existing, unchanged</span><span><i class="lg-purple"></i>New or changed in this PR</span><span><i class="lg-coral"></i>Removed or faulty</span></div>
```

## 6. Delta card

Rendered on resume or refresh. One row per new commit, comment, review, or body change; state
line first. Nothing new: skip the card, say so in one line.

```html
<h2 class="sr-only">What changed on the PR since the tour</h2>
<style>
.wd-state{font-size:13px;color:var(--text-secondary);margin:0 0 8px}
.wd-row{display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-top:0.5px solid var(--border);font-size:13px;line-height:1.45}
.wd-tag{font-size:11px;padding:2px 7px;border-radius:var(--radius);flex:none;min-width:56px;text-align:center;background:var(--surface-1);color:var(--text-secondary)}
.wd-who{color:var(--text-muted)}
</style>
<div class="wd-state">Still open · 2 new commits · 1 new review since the tour</div>
<div class="wd-row"><span class="wd-tag">commit</span><span>Adds a per-channel attempt cap to the sender. <span class="wd-who">a1b2c3d</span></span></div>
<div class="wd-row"><span class="wd-tag">commit</span><span>Lowers the retry log to debug. <span class="wd-who">d4e5f6a</span></span></div>
<div class="wd-row"><span class="wd-tag">review</span><span>Asks whether the cap should be configurable. <span class="wd-who">reviewer · changes requested</span></span></div>
```
