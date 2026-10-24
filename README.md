# walk-pr

A Claude Code plugin that walks you through a pull request stage by stage, with a side pane you
drive by clicking.

The tour opens with a verdict and a stage menu. It explains the problem and the approach with
diagrams, then each important part of the change in prose with the decisive code lines, one
to three short snippets per stage. It
reviews as it goes, remembers every finding (yours too, raised in chat), and ends with one card plus Approve, Request changes
or Comment, posting the findings you raised as line comments in that review. The pane then stays
on the outcome; Resume tour re-reads the PR for new commits and comments.

<p>
  <img width="49%" height="1522" alt="image" src="https://github.com/user-attachments/assets/84100540-bfb8-4881-9838-e8c1e569e4fb" />
  <img width="49%" height="1522" alt="image" src="https://github.com/user-attachments/assets/9a87cdc3-5559-4871-adb1-0f9771f83695" />

</p>

## Build a change the same way (beta)

```
/walk-pr:build <issue ID or URL from your tracker, or the problem in your words>
```

Beta: the plan tour and the pane are exercised; the run, the end verification and the draft
PR step have not been through a real ticket yet. Expect rough edges there.

Same pane, other direction. The tour walks a plan instead of a diff: problem, approach, then
one stage per part to build, each with its commits. Every design choice is a decision with
options in the pane; the recommended one is marked, nothing is picked for you. Corrections in
chat re-plan the stages they touch. Open plan opens the plan file. Approve plan marks the
issue in progress when a tracker is connected, branches in a
worktree and implements commit by commit, each with its own
focused test; the heavy verification runs once at the end, a subagent reviews the diff, you
pick which findings get fixed, and a draft PR opens.

<img width="75%" height="1488" alt="image" src="https://github.com/user-attachments/assets/88391882-0353-4c17-b66a-71acc85aa944" />


## Install

In a terminal Claude Code session:

```bash
/plugin install walk-pr --marketplace nestorsokil/walk-pr
```

Answer `y` to add the marketplace, then pick the user scope. The skill and the pane load in every
session from then on, the desktop app included.

## Dependencies

Checked at every session start; anything missing shows in the pane's empty state and as a toast.

- `gh`, logged in: reads the PR, its comments and commits, and posts the review. GitHub only
  for now.
- Optional: an issue tracker (Linear, for example) and a chat (Slack, for example) connected
  as MCP servers. The tour reads tickets and threads through them when present and lists the
  bare link otherwise. An observability MCP server or CLI (Dash0's, for example) adds
  telemetry prompts to the stages.
- `git`: reads the before and after code without touching your working tree.
- Node with `npx`: renders diagrams in a terminal through `@mermaid-js/mermaid-cli`. The first
  render downloads the package and a headless Chromium (about 2 minutes once). Prewarm with

  ```bash
  npx -y -p @mermaid-js/mermaid-cli mmdc --version
  ```

  Without it the terminal gets plaintext box diagrams.
- A terminal that draws images for the pane's diagram: Ghostty, kitty or WezTerm. Others show
  the diagram's one-line text instead.
- The desktop app needs nothing extra: diagrams render as inline widgets there.

## Use

```
/walk-pr:tour <PR number, PR URL, branch, or nothing for the current diff>
```

"Walk me through PR 123" works too. `/walk-pr-pane` reopens the pane if you closed it.

## Terminal

The pane draws in a terminal too. Diagrams render to PNG through mermaid-cli (`npx`, first run
downloads it) and show inside the pane on terminals with image support: Ghostty, kitty, WezTerm.
Elsewhere the pane shows the diagram's one-line description and the chat gets a plaintext box
diagram.

## Layout

- `skills/tour/` — the review skill: `SKILL.md`, widget templates in `widgets.md`.
- `skills/build/` — the plan-and-implement skill (beta); reuses the tour's sections.
- `hooks/`, `types/` — the pane mod. [PANE.md](PANE.md) lists the prompts its buttons send.

## Develop

Clone, then run a session with the folder as a plugin dir:

```bash
claude --plugin-dir /path/to/walk-pr
```

`claude plugin validate /path/to/walk-pr` checks the manifest, marketplace file and hooks.
