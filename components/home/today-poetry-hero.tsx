import Link from "next/link";
import type { Route } from "next";

import { WeeklyStreakMatrix } from "@/components/home/weekly-streak-matrix";
import { PoetryPoster } from "@/components/poster/poetry-poster";
import { PosterTitleBlock } from "@/components/poster/poster-title-block";
import type { DailyPoetryResult } from "@/lib/poetry/daily";
import type { WeeklyCheckIn } from "@/lib/stats/weekly-checkin";

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
  weeklyCheckIn: WeeklyCheckIn;
};

export function TodayPoetryHero({
  todayPoetry,
  weeklyCheckIn,
}: TodayPoetryHeroProps) {
  const imageSrc =
    todayPoetry.poetry.image.thumbPath ?? todayPoetry.poetry.image.imagePath;

  return (
    <section className="relative overflow-hidden rounded-[2.4rem] bg-surface px-5 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.32),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.24),transparent_32%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(18rem,28rem)_minmax(0,1fr)] lg:items-start">
        {/* Left: Poetry poster image */}
        <PoetryPoster
          variant="hero"
          imageSrc={imageSrc}
          imageAlt={`${todayPoetry.poetry.title} 配图`}
          isPlaceholder={todayPoetry.poetry.image.isPlaceholder}
          priority
        >
          <PosterTitleBlock
            title={todayPoetry.poetry.title}
            author={todayPoetry.poetry.author}
            dynasty={todayPoetry.poetry.dynasty}
          />
        </PoetryPoster>

        {/* Right: seamless text flow — no card borders */}
        <div className="flex flex-col py-2">
          {/* Compact header: title → author → streak */}
          <p className="text-sm tracking-[0.24em] text-ink-400">
            今日一诗
          </p>
          <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
            {todayPoetry.poetry.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-400">
            <span>
              {todayPoetry.poetry.dynasty} ·{" "}
              <Link
                href={`/author/${todayPoetry.poetry.author}` as import("next").Route}
                className="transition hover:text-ink-900"
              >
                {todayPoetry.poetry.author}
              </Link>
            </span>
            {todayPoetry.isReadToday && (
              <span className="inline-flex items-center gap-1 text-xs tracking-[0.15em] text-ink-400">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" className="text-emerald-500" />
                  <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" />
                </svg>
                今日已读
              </span>
            )}
          </div>

          <div className="mt-3">
            <WeeklyStreakMatrix data={weeklyCheckIn} />
          </div>

          {/* Poem body — pure serif, generous breathing room */}
          <div className="mt-10 space-y-3">
            {todayPoetry.poetry.lines.slice(0, 4).map((line, index) => (
              <p
                key={`${index}-${line}`}
                className="font-serif text-xl leading-[2.4] tracking-[0.15em] text-ink-900 sm:text-2xl"
              >
                {line}
              </p>
            ))}
          </div>

          {/* Primary CTA — after the poem, natural reading flow */}
          <div className="mt-8">
            <Link
              href={getHomeCtaHref(todayPoetry.poetry.id, todayPoetry.isReadToday)}
              className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-[var(--shadow-card)]"
            >
              {getHomeCtaLabel(todayPoetry.isReadToday)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
