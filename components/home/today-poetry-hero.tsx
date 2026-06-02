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
    <section className="relative overflow-hidden rounded-[2.4rem] border border-ink-200 bg-surface px-5 py-6 shadow-[var(--shadow-panel)] sm:px-6 lg:px-8">
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
          <div className="rounded-[1.75rem] border border-ink-200 bg-surface/78 p-5 shadow-[var(--shadow-panel)]">
            <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
              今日一诗
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              {todayPoetry.poetry.title}
            </h1>
            <p className="mt-2 text-sm text-ink-600">
              {todayPoetry.poetry.dynasty} ·{" "}
              <Link
                href={`/author/${todayPoetry.poetry.author}` as import("next").Route}
                className="transition hover:text-ink-900"
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
                className="inline-flex rounded-full border border-ink-200 bg-primary/10 px-5 py-3 text-sm font-medium text-ink-900 transition hover:bg-surface/50"
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
