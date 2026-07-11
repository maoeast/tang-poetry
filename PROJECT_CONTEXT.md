# Project Context

This file stores stable project facts and global constraints. It should not track per-session progress. Use `.continue-here.md` for the current task.

## Product

诗笺阁是面向家庭学习场景的中文诗词学习 Web 应用。一期是单用户家庭部署。

Core surfaces:
- Home: today's poem, weekly check-in state, six navigation cards.
- Poetry detail: immersive reading, images, audio, AI explanation, favorite action.
- Browse: source/form/scene categories and search across poetry records.
- Challenge: five-question round with couplet, author, title, and ordering questions.
- Review: spaced repetition queue driven by learning events.
- Me: learning stats, favorites, and poet affinity.
- Author pages: poet profile and poem list.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma 6.9
- PostgreSQL 16
- Node 22
- `node:test` via `tsx`
- Playwright for e2e smoke checks

## Approved Desktop Direction

As of 2026-07-11, the approved desktop direction is Tauri v2 with an offline-first local data layer. The desktop app should work without network access for reading, learning records, review, challenge, and favorites, then synchronize with the existing family server when online.

This is an explicit exception to the default "no new database engines unless requested" rule: the user requested local offline persistence, so local SQLite is approved for the desktop app. The Web app remains Next.js + Prisma + PostgreSQL.

## Data Model Boundaries

Phase 1 has no `User` model. Learning, challenge, review, and favorite records use the fixed `SYSTEM_USER_ID` environment variable.

Runtime image data comes from `ImageAsset`. Static JSON and generated image files are pipeline inputs or artifacts, not the runtime authority.

Poem display text uses dual-script source fields. Simplified and traditional variants come from source data; runtime OpenCC is not display authority.

## Global Data Flows

- `LearningRecord.eventType = "view_poetry"` initializes or updates first review timing.
- `challenge_correct` and `challenge_wrong` advance or reset `ReviewState`.
- Review intervals are fixed in `lib/review/scheduler.ts`: `1 -> 2 -> 4 -> 7 -> 15 -> 30` days.
- AI explanations are cached in `Poetry.aiExplanation` by `{audience}_{promptVersion}`.
- Runtime images are resolved through image repository helpers with placeholder fallback.
- Audio URLs are mapped through `lib/audio.ts`, preferring `sourceUid` when present.

## Current Stable Status

As of this context refresh, the app has moved beyond the original Phase 1 skeleton. The repository contains the main product surfaces, multi-source poetry data, generated poetry images, author avatars, favorites, review, challenge, AI explanation, and deployment documentation.

For exact current gaps, read `.continue-here.md` and the active plan in `docs/superpowers/plans/`.

## Documentation Rules

- `AGENTS.md` is the single source of agent rules.
- `CLAUDE.md` is a pointer to `AGENTS.md`.
- `docs/INDEX.md` is the document router.
- `.continue-here.md` is the current detailed handoff.
- `HANDOFF.md` is the session start/end workflow with an auto-updated handoff block.

## Hard Constraints

- Do not add Prisma runtime compatibility branches after schema changes. Regenerate Prisma client and restart services.
- Do not introduce account auth, a `User` model, or multi-user assumptions unless requested.
- Do not use Electron for desktop packaging; the approved desktop shell is Tauri.
- Do not force the current Next.js App Router server app into a Tauri sidecar as the primary offline architecture.
- Do not change fixed UI labels when implementing simplified/traditional script variants.
- Do not replace database-backed runtime images with static JSON lookups.
- Do not treat old screenshots or historical handoff files as current UI truth without checking the running app.
