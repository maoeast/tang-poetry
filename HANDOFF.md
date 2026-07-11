# Session Handoff

Use this file as the human-pasteable session start and end guide. The detailed source is `.continue-here.md`; the block below is the compact digest.

<!-- HANDOFF:START -->
## Current Handoff

- Current task: start the approved Tauri offline-first desktop and sync implementation.
- State: code/UI stabilization has been implemented and verified; the new executable plan is `docs/superpowers/plans/2026-07-11-tauri-offline-desktop-sync.md`.
- Next atomic action: implement task 1 of the Tauri plan by adding `lib/sync/events.ts` and `lib/sync/projections.ts`, defining SyncEvent/event payload types plus minimal pure projection tests, then run `npm test`.
- Verification commands: `git status --short --branch -uall`, `npm test`
- Blockers: none.
<!-- HANDOFF:END -->

## Session Start

1. Read `AGENTS.md`.
2. Read `.continue-here.md`.
3. Read this `HANDOFF.md` block.
4. Read `docs/INDEX.md` and choose task-relevant docs only.
5. Check git state:
   - `git status --short --branch -uall`
   - `git log --oneline -5`
   - `git stash list`
6. If `.continue-here.md` conflicts with git state, stop and ask before editing.

Startup response shape:

```text
Current: <one sentence>
Next: <one atomic action>
Blockers: <none or exact blocker>
Repo: <branch and dirty state>
```

## Session End

1. Overwrite `.continue-here.md` with:
   - `Current State`
   - `Next Action`
   - `Blockers`
   - `Key Decisions`
   - `Relevant Files`
2. Update only the marked block between `<!-- HANDOFF:START -->` and `<!-- HANDOFF:END -->` in this file.
3. Update `PROJECT_CONTEXT.md` only if stable architecture, product reality, or global constraints changed.
4. Check worktree with `git status --short --branch -uall`.
5. If committing is requested, stage exact files only. Do not use `git add .`.
6. End with:

```text
Done: <what changed>
Blocker: <none or exact blocker>
Next: <one atomic action>
Repo: <branch and dirty state>
```

## Handoff Quality Rules

- `Next Action` must be one atomic action.
- Verification commands must be real project commands.
- Do not copy old historical progress into the current handoff.
- Historical plans stay in `docs/superpowers/plans/` and are discoverable through `docs/INDEX.md`.
