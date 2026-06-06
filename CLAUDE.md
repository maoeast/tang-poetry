# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

唐诗画境 — a family-oriented Tang Dynasty poetry learning web app. Phase 1 is a single-user deployment using a fixed `SYSTEM_USER_ID` (no User model, no auth accounts). All text is Chinese (zh-CN) with simplified/traditional script variant support.

## Commands

```bash
# Dev server
npm run dev

# Run all unit tests (Node.js built-in test runner via tsx)
npm test

# Run a single test file
./node_modules/.bin/tsx --test tests/challenge/judge.test.ts

# Lint
npm run lint

# Production build
npm run build

# E2E smoke test (requires dev server running)
npm run test:smoke

# Database
docker compose up -d                              # Start PostgreSQL 16
./node_modules/.bin/prisma migrate dev            # Run migrations
npm run import:ts300                               # Import 366 poems + 365-day schedule

# Asset pipelines
./node_modules/.bin/tsx scripts/prepare-image-generation.ts   # Generate image prompts
./node_modules/.bin/tsx scripts/finalize-image-assets.ts      # Scan images → mark ready
npm run import:image-assets                                    # Import images into DB
./node_modules/.bin/tsx scripts/retry-image-downloads.ts      # Retry failed downloads (72h window)
```

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + Prisma 6.9 + PostgreSQL 16 + Node 22

### Page Routes (all Server Components, `force-dynamic` unless noted)

| Route | Purpose |
|---|---|
| `/` | Today's poem (from `DailyPoetry` table) |
| `/poetry/[id]` | Poem detail with AI explanation |
| `/challenge` | Quiz mode — 4 question types (couplet, author, title, ordering) |
| `/review` | Spaced repetition review buckets |
| `/review/[id]` | Review player for a specific poem |
| `/browse` | Browse poems by form/genre categories |
| `/me` | User stats, streak, poet affinity |
| `/unlock` | Password gate |
| `/api/ai/explain` | POST — DeepSeek AI explanation proxy |

### Data Flow

- **Today's poem**: `DailyPoetry` → `Poetry` → `ImageAsset` (runtime image from DB, no static JSON)
- **Learning events**: `view_poetry`, `challenge_correct/wrong`, `review_correct/wrong` → `LearningRecord` → drives `ReviewState` initialization and interval progression
- **Review scheduler**: Fixed interval sequence `[1, 2, 4, 7, 15, 30]` days in `lib/review/scheduler.ts`
- **AI explanation**: `Poetry.aiExplanation[audience_promptVersion]` cache → fallback to DeepSeek API
- **Script variants**: Simplified from `data/ts300.simple.json`, traditional from `data/ts300.raw.json`. Cookie is the SSR truth source; `localStorage` is client-side mirror only. Runtime OpenCC is **not** used for display text.
- **Audio**: `public/audio/poetry/` — filename mapped via `Poetry.sourceUid` or `poetryId` (`lib/audio.ts`). Directory is gitignored.
- **Images**: `ImageAsset` table is the sole runtime source. 366 poems all have `ready` images (`storybook-watercolor`, `v1`). Fallback: `/images/placeholders/default-poetry-card.jpg`.

### Key Directories

- `lib/` — Core business logic organized by domain: `poetry/`, `challenge/`, `review/`, `ai/`, `stats/`, `images/`, `audio/`, `browse/`
- `components/` — React components organized by feature: `home/`, `poetry/`, `challenge/`, `review/`, `browse/`, `me/`, `audio/`, `lyrics/`, `poster/`
- `scripts/` — Data import and asset generation scripts (TypeScript via `tsx`, Python for TTS)
- `tests/` — Unit tests mirroring `lib/` structure + `e2e/` for Playwright
- `docs/` — Design specs, implementation plans, asset strategy docs
- `data/` — Static JSON source files (poems, image asset metadata)

### Patterns

- **Server Components by default** — all pages are async server components; interactivity is isolated to specific client components
- **Repository pattern with DI** — lib functions accept optional `repository` parameter for testability
- **Server actions** — `"use server"` in page files for mutations (`recordChallengeAnswer`, `recordReviewSelfReport`, `unlockApp`)
- **Auth gate** — `middleware.ts` checks `APP_PASSWORD` env var; single cookie-based session (`tang-poetry-session=verified`)

### Prisma Models

7 models: `Poetry`, `AudioMeta`, `ImageAsset`, `DailyPoetry`, `LearningRecord`, `ChallengeAttempt`, `ReviewState`, `Favorite`. No `User` model — Phase 1 uses `SYSTEM_USER_ID` env var (default: `family-001`).

## Constraints & Rules

- **No Prisma compatibility branches** — when `schema.prisma` changes, regenerate client and restart. Never add fallback query paths for stale runtime clients. (See `AGENTS.md`)
- **TDD** — write failing tests first, then implement. Run `npm test` after changes.
- **Dual-script authority** — simplified text from `ts300.simple.json`, traditional from `ts300.raw.json`. Never use runtime OpenCC for display text.
- **Script variant scope** — simplified/traditional toggle applies only to poem title, author, and body text — not UI labels, navigation, or buttons.
- **AI cache keys** — fixed format `{audience}_{promptVersion}`, Phase 1 only `child_v1` and `general_v1`.
- **Image prompts** — must include poem name + author + dynasty + excerpt; scene/atmosphere/subject/border imagery driven per-poem. No fixed template across all poems.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (default: `postgresql://dev:devpassword@localhost:5432/tang_poetry`) |
| `DEEPSEEK_API_KEY` | Required for AI explanation feature |
| `DEEPSEEK_BASE_URL` | DeepSeek API endpoint (default: `https://api.deepseek.com`) |
| `APP_PASSWORD` | Access gate password (empty = no gate) |
| `SYSTEM_USER_ID` | Fixed user ID (default: `family-001`) |
| `AUDIO_BASE_URL` | Audio CDN prefix (default: `/audio/poetry`) |
| `STEPFUN_API_KEY` | TTS generation script only |

## Cross-System Data Isolation

Docker volume (`tangpoetry_postgres-data`) and gitignored local files are **not shared** across OS environments. After switching systems (e.g. Windows → Linux):

**Must migrate from old system** (pg_dump / pg_restore):
- `Poetry` — annotations, translations, AI explanations (generated by scripts, not in repo)
- `AudioMeta` — audio metadata
- User data — `LearningRecord`, `ChallengeAttempt`, `ReviewState`, `Favorite`

**Must copy from old system**:
- `public/audio/explain/` — AI explanation audio (gitignored)
- `public/images/generated/` — poetry images (gitignored)
- `.env.local` — API keys

**Rebuildable from repo** (no migration needed):
- `node_modules` — `npm install` (must reinstall when switching OS for native binaries like lightningcss)
- `ImageAsset` / `DailyPoetry` — re-import via `npm run import:all` and `npm run import:image-assets`
- `.next` — auto-generated by `npm run dev`

### Multi-Source Import & Cross-System Sync

Three poetry sources share the same `Poetry` table, differentiated by ID prefix:

| Source | ID prefix | Dynasty | Count |
|---|---|---|---|
| 唐诗三百首 | `ts300-` | 唐 | 321 |
| 古诗三百 | `gs300-` | 先秦/魏晋/宋/元/明/清 | 278 |
| 宋词精选 | `sc200-` | 宋 | 222 |

**切系统后导入新数据不丢失旧数据**：`import:gs300` / `import:sc200` 使用 upsert，只写入基础字段（dynasty/lines/tags），不碰 `translation`/`annotation`/`aiExplanation`。已在系统 A 完成的译文/AI讲解/音频在系统 B 导入新诗后仍完整保留。

**切回 Windows 后操作**（假设 Deepin 已导入古诗+宋词）：
1. `git pull` 拉取新的 JSON 数据文件和导入脚本
2. `npm run import:gs300 && npm run import:sc200 && tsx scripts/rebuild-daily-seeds.ts`
3. Windows 原有的唐诗译文/注释/AI讲解/音频完全不受影响

**同理**：若需将 Windows 的译文/注释同步到 Deepin，需 `pg_dump` / `pg_restore` 做全量 DB 迁移。

## Current Status

Tasks 1–12 complete. Task 13 (E2E testing) nearly done. 新增古诗三百(278首) + 宋词精选(222首) 数据集和导入管线。下一步：首页改版，将功能卡片升级为六宫格（古诗三百/唐诗三百/宋词精选/场景时令/挑战闯关/复习成长）。
