---
name: polish
description: Runs polish rounds on an open PR. A fresh subagent reviews the PR as an outside reviewer and posts one COMMENT review on GitHub. The main session then fixes each finding that holds, replies in the thread of each finding it drops, pushes, and drives CI to green. No side pane and no plan file. Trigger on "/walk-pr:polish", "polish this PR", "self-review this PR", "review round", or "run a review round on <PR>".
argument-hint: "<PR link or number> [rounds]"
---

$ARGUMENTS

# Polish PR

Run at least one round on the PR. Run more rounds only when the user asks, or when the argument gives a number of rounds.

## Setup

1. Resolve the PR: `gh pr view <n> --json number,url,baseRefName,headRefName,title,author`. With no argument, use the PR of the current branch.
2. Make sure the local checkout is on the PR's head branch and is up to date with the remote. If it is not, stop and say so.
3. Find the repo's review skill, if one exists: a `SKILL.md` under `.claude/skills/` or `.agents/skills/` whose name or description says it reviews pull requests.
4. Find the round number `k`: count the earlier reviews on the PR whose body starts with `**Review round`, and add 1.

## A round

### 1. Review (fresh subagent)

Spawn one fresh subagent with no conversation context, and wait for it. The brief below is all it knows. Give it the PR url, the base branch, the repo review skill's path (if found), the path of `../tour/SKILL.md`, the plan file's path (when the caller has one), the round number, and these instructions:

> Review this PR as an outside reviewer who has not seen it built.
>
> Read the PR title and body and the linked issue. Then get the criteria. With a plan file: read only its Criteria and Out of scope sections. Without one: before you read the diff, write what the issue and the PR body say the change must do, one line per behaviour. Then read the diff against the base, and the surrounding code at the head where the diff alone does not settle a point. When a repo review skill is given, apply its checks and patterns; the labels below stay the same with or without it.
>
> Make three passes, in this order:
> - **criteria**: for each criterion, name the lines that make it true and the test that fails without them. A criterion with neither is an `issue`. Behaviour in the diff that no criterion, the issue or the PR body asks for is a `question`;
> - **correctness**: walk every changed file as gather step 5 of the tour skill does, with the surrounding code at the head, and answer its review lens for the PR's kind;
> - **fit**: for each new function, type, file, config key and name, find its nearest sibling in the codebase. Record a finding when the change repeats a helper that exists, follows a different pattern than its siblings, sits in a component or layer that does not own it, or breaks a convention in the repo guidance. The evidence is the sibling's or the rule's file and line.
>
> Also check that:
> - the body describes what the diff does and nothing else;
> - every dependency, lockfile, generated output and import the change needs is in the diff and consistent;
> - tests cover the change;
> - the commit titles follow the repo's convention.
>
> **Evidence rule.** Record a finding only with evidence: the file and line at the head, the quoted decisive lines, and one sentence of evidence of one of these kinds:
> - a concrete input or sequence that makes the code wrong;
> - an invariant the code breaks, named by where it is stated: a lock or ordering rule, a boundary or ownership rule, an API convention, a contract in a doc or type;
> - a failure path the code leaves unhandled or unobservable, shown by the lines that swallow it.
>
> **Labels.** `issue` is code that is wrong or breaks an established pattern on a reachable path, under one of the three evidence kinds. `question` is a doubt the author can settle. `suggestion` is a better way that is not required. `nitpick` is style or wording. `pre-existing` is a defect the PR did not introduce. An `issue` whose evidence is a hunch is a `question`. One finding per defect: the same defect in several files is one finding that names the other places. Record nothing for correct code.
>
> **Post** one review with `gh api repos/{owner}/{repo}/pulls/<n>/reviews`, `event: COMMENT`. The `body` starts with `**Review round <k>** (automated)` and one sentence on what was covered. `comments` holds each finding as a line comment, one to three sentences, starting with its label in bold. GitHub accepts a line comment only on a line inside a hunk of the PR diff, so place each one from `gh pr diff <n>`:
> - an added or context line: `path`, `line`, `side: RIGHT`;
> - a removed line: `path`, `line` as numbered on the base, `side: LEFT`;
> - a range: add `start_line` and `start_side` with the same side;
> - a line outside every hunk (surrounding code, a missing test, the PR body): no line comment. Put it in the review `body` as its own paragraph: `**<label>** \`<path>:<line>\`: <comment>`.
>
> Post once. A 422 means a comment is still misplaced: move every line comment into the body the same way and post once more.
>
> **Return** the review URL and the findings as a list: file, line, label, evidence, and the posted comment id (none for a finding in the body). List the comment ids with `gh api repos/{owner}/{repo}/pulls/<n>/comments --jq '.[] | select(.pull_request_review_id == <review id>) | {id, path, line}'`.

### 2. React (main session)

Handle every returned finding. Leave none without a fix or a reply.

- An `issue`, a correct `suggestion`, or an inconsistency in the body or dependencies: fix it in its own commit, with a focused test where one applies.
- A `nitpick`: fix it when the fix is one line. Otherwise drop it.
- A finding that is wrong, out of scope, or not worth the change: drop it. Reply in its thread in one or two sentences that say why: `gh api -X POST repos/{owner}/{repo}/pulls/<n>/comments/<id>/replies -f body=...`. For a finding in the review body, reply with one PR comment that covers all of them.
- A `pre-existing` finding: drop it with a reply, unless the user asks for the fix.

When a fix changes what the PR does, update the PR body in the same round. Every commit message follows the repo's convention.

### 3. Drive to green

Push. Watch CI with `gh pr checks <n> --watch`. Fix each failing check in a new commit and push again. Green means every check concluded without failure.

### 4. Report

One line per round: the round number, how many findings were fixed and how many dropped, and the review link. After the last round, add one line on what the user does next: mark the PR ready for review, or run another round.

## Rules

- Never approve or request changes. The review event is always `COMMENT`.
- Never force-push.
- If a fix fails twice, stop. Report the root cause, the cheap fix, and the workaround you did not take.
