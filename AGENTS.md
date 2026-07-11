# Agent Rules

`AGENTS.md` is the single source of agent instructions for this repo. `CLAUDE.md` must remain a pointer to this file, not a second copy of the rules.

## Startup Order

1. Read `AGENTS.md`.
2. Read `.continue-here.md` for the current handoff.
3. Read `docs/INDEX.md` to choose only the task-relevant docs.
4. Read `PROJECT_CONTEXT.md` only when stable architecture or product context matters.
5. Check the live repo state with `git status --short --branch -uall` before edits.

Conflict priority: current code > `.continue-here.md` > `AGENTS.md` > `PROJECT_CONTEXT.md` / `docs/INDEX.md` > older docs.

## Project Defaults

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 6.9, PostgreSQL 16, Node 22.
- Phase 1 is a single-user family deployment. Use `SYSTEM_USER_ID`; do not introduce a `User` model or account system unless explicitly requested.
- Runtime image source is the database `ImageAsset` table. Missing images fall back to `/images/placeholders/default-poetry-card.jpg`.
- Simplified and traditional poem display text comes from dual source data. Do not use runtime OpenCC as final display authority.
- Script variant toggles apply only to poem title, author, and body text, not fixed UI labels or navigation copy.

## Default Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Unit tests: `npm test`
- Lint: `npm run lint`
- Production build: `npm run build`
- E2E smoke: `npm run test:smoke`
- Prisma generate: `npm run prisma:generate`
- Prisma migrate: `npm run prisma:migrate`

All other commands live in `package.json`.

## Hard Rules

- Do not add business-layer compatibility branches for stale Prisma runtime clients after `schema.prisma` changes. Regenerate Prisma client and restart the service instead.
- Prefer fail-fast behavior when the running process is out of sync with the current Prisma schema.
- Do not keep temporary development-only compatibility code in `lib/` just to avoid restarting services.
- Do not add new runtime frameworks, state libraries, auth systems, database engines, or image/audio processing dependencies unless the user asks for that direction.
- Do not move generated images, audio, local database files, or user scratch files to "protect" the tree. Treat them as user work unless the task explicitly owns them.
- Do not run `git add .`. Stage exact files only when the user asks to commit.
- Do not push, publish, tag, or close issues unless the user explicitly asks.

## Coding Rules

- Server Components by default. Put client interactivity in focused client components.
- Keep domain logic in `lib/<domain>/`; keep React UI in `components/<feature>/`.
- Preserve repository dependency injection patterns in `lib/` so tests can use mock repositories.
- For behavior changes, update or add focused `node:test` coverage before relying on manual checks.
- For UI changes, verify the rendered page at desktop width and 375px mobile width when practical.
- Keep edits scoped to the requested surface. Do not bundle unrelated refactors.

## Documentation Routing

Use `docs/INDEX.md` as the document router. Do not read every doc at session start.

Common targets:
- Current handoff: `.continue-here.md`
- Stable context: `PROJECT_CONTEXT.md`
- General setup and environment: `README.md`
- Production deployment: `docs/deployment.md`
- Audio assets: `docs/audio-asset-strategy.md`
- Image generation: `docs/image-generation-plan.md`
- Code and UI stabilization plan: `docs/superpowers/plans/2026-07-11-code-ui-stabilization.md`

## Handoff Protocol

When asked to prepare a handoff or end a session:

1. Overwrite `.continue-here.md` with these sections: `Current State`, `Next Action`, `Blockers`, `Key Decisions`, `Relevant Files`.
2. Keep `Next Action` as one atomic action, not a broad goal.
3. List real verification commands, not "self-test".
4. Update only the `<!-- HANDOFF:START -->` to `<!-- HANDOFF:END -->` block in `HANDOFF.md`.
5. Do not update `PROJECT_CONTEXT.md` unless stable architecture, product reality, or global constraints changed.

Default git workflow: this is a single-maintainer repo and work normally happens on `main`. Create a branch only when the user asks, when merging another branch, or when the change is a high-risk experiment.
