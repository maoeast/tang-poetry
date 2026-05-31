# Agent Rules

## Development-Phase Prisma Changes

- In this repo's development phase, do not add business-layer compatibility branches for stale Prisma runtime clients after schema changes.
- When `schema.prisma` changes, the expected fix is to regenerate Prisma client and restart the dev server or related processes.
- Prefer fail-fast behavior over runtime fallback when the running process is out of sync with the current Prisma schema.
- Do not keep temporary development-only compatibility code in `lib/` just to avoid restarting services.

## Practical Rule

- If a page crashes because the running Prisma client does not know a newly added field, fix the developer workflow by restarting the service instead of adding fallback query paths.
