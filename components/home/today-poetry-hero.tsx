import Link from "next/link";
import type { Route } from "next";

import { LyricsWindow } from "@/components/lyrics/lyrics-window";
import { PoetryPoster } from "@/components/poster/poetry-poster";
import { PosterStatusBadge } from "@/components/poster/poster-status-badge";
import { PosterTitleBlock } from "@/components/poster/poster-title-block";
import type { DailyPoetryResult } from "@/lib/poetry/daily";

export function getHomeCtaLabel(isReadToday: boolean) {
  return isReadToday ? "去挑战这首诗" : "阅读全文";
}

export function getHomeCtaHref(poetryId: string, isReadToday: boolean): Route {
  if (isReadToday) {
    return `/challenge?poetryId=${poetryId}` as Route;
  }

  return `/poetry/${poetryId}` as Route;
}

type TodayPoetryHeroProps = {
  todayPoetry: DailyPoetryResult;
};

export function TodayPoetryHero({ todayPoetry }: TodayPoetryHeroProps) {
  const lyrics = todayPoetry.poetry.lines.slice(0, 4).map((line) => ({
    text: line,
  }));
  const imageSrc =
    todayPoetry.poetry.image.thumbPath ?? todayPoetry.poetry.image.imagePath;

  return (
    <section className="relative overflow-hidden rounded-[2.4rem] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-6 shadow-[var(--shadow-soft)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.32),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.24),transparent_32%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(18rem,28rem)_minmax(0,1fr)] lg:items-start">
        <PoetryPoster
          variant="hero"
          imageSrc={imageSrc}
          imageAlt={`${todayPoetry.poetry.title} 配图`}
          isPlaceholder={todayPoetry.poetry.image.isPlaceholder}
          priority
          badge={
            todayPoetry.isReadToday ? (
              <PosterStatusBadge label="已读" tone="ready" />
            ) : (
              <PosterStatusBadge
                label={todayPoetry.poetry.image.isPlaceholder ? "待配图" : "今日一诗"}
                tone={todayPoetry.poetry.image.isPlaceholder ? "placeholder" : "neutral"}
              />
            )
          }
        >
          <PosterTitleBlock
            title={todayPoetry.poetry.title}
            author={todayPoetry.poetry.author}
            dynasty={todayPoetry.poetry.dynasty}
          />

        </PoetryPoster>

        <div className="space-y-5">
          <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/78 p-5 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
            <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
              今日一诗
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              {todayPoetry.poetry.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {todayPoetry.poetry.dynasty} ·{" "}
              <Link
                href={`/author/${todayPoetry.poetry.author}` as import("next").Route}
                className="transition hover:text-[var(--color-ink)]"
              >
                {todayPoetry.poetry.author}
              </Link>
            </p>


            <div className="mt-5 flex flex-wrap items-center gap-3">
              {todayPoetry.isReadToday ? (
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-900 uppercase">
                  今日已读
                </span>
              ) : null}

              <Link
                href={getHomeCtaHref(todayPoetry.poetry.id, todayPoetry.isReadToday)}
                className="inline-flex rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-5 py-3 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
              >
                {getHomeCtaLabel(todayPoetry.isReadToday)}
              </Link>
            </div>
          </div>

          <LyricsWindow
            mode="manual"
            lines={lyrics}
            showPinyin={false}
            activeLineIndex={0}
            className="max-h-[34rem] overflow-y-auto"
          />
        </div>
      </div>
    </section>
  );
}
