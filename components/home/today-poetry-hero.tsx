import Link from "next/link";
import type { Route } from "next";

import { WeeklyStreakMatrix } from "@/components/home/weekly-streak-matrix";
import { LyricsWindow } from "@/components/lyrics/lyrics-window";
import { PoetryPoster } from "@/components/poster/poetry-poster";
import { PoetryTitleAuthor } from "@/components/poetry/poetry-title-author";
import { getAuthorAvatarUrl } from "@/lib/author/repository";
import type { DailyPoetryResult } from "@/lib/poetry/daily";
import { splitCoupletLines } from "@/lib/poetry/lines";
import type { WeeklyCheckIn } from "@/lib/stats/weekly-checkin";

/** @deprecated No longer used by homepage — kept for test compatibility */
export function getHomeCtaLabel(isReadToday: boolean) {
  return isReadToday ? "去闯关这首诗" : "阅读全文";
}

/** @deprecated No longer used by homepage — kept for test compatibility */
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

export function buildHomePoetryPreviewLines(lines: string[]) {
  return splitCoupletLines(lines, []).map((l) => l.text);
}

export function TodayPoetryHero({
  todayPoetry,
  weeklyCheckIn,
}: TodayPoetryHeroProps) {
  const imageSrc =
    todayPoetry.poetry.image.thumbPath ?? todayPoetry.poetry.image.imagePath;
  const allLyrics = splitCoupletLines(todayPoetry.poetry.lines, []);
  const previewLines = allLyrics.slice(0, 8);
  const hasMoreLines = allLyrics.length > previewLines.length;

  return (
    <section className="relative overflow-hidden rounded-[2.4rem] bg-surface px-5 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.32),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.24),transparent_32%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(18rem,28rem)_minmax(0,1fr)] lg:items-start">
        {/* Left: Poetry poster image with overlays */}
        <PoetryPoster
          variant="hero"
          imageSrc={imageSrc}
          imageAlt={`${todayPoetry.poetry.title} 配图`}
          isPlaceholder={todayPoetry.poetry.image.isPlaceholder}
          priority
          badge={
            <span className={`rounded-full px-3 py-1 text-xs tracking-[0.18em] shadow-sm backdrop-blur-sm ${
              todayPoetry.isReadToday
                ? "bg-emerald-50/90 text-emerald-600"
                : "bg-surface/90 text-ink-600"
            }`}>
              {todayPoetry.isReadToday ? "今日已读" : "今日一诗"}
            </span>
          }
        >
          <div className="absolute inset-x-0 bottom-0 pointer-events-none">
            <div className="mx-4 mb-4 rounded-xl bg-surface/85 px-3 py-2 shadow-sm backdrop-blur-sm">
              <WeeklyStreakMatrix data={weeklyCheckIn} />
            </div>
          </div>
        </PoetryPoster>

        {/* Right: title + author + body + CTAs */}
        <div className="flex flex-col items-center py-2 text-center">
          <PoetryTitleAuthor
            title={todayPoetry.poetry.title}
            author={todayPoetry.poetry.author}
            dynasty={todayPoetry.poetry.dynasty}
            authorAvatarUrl={getAuthorAvatarUrl(todayPoetry.poetry.author)}
          />

          {/* Poem body */}
          <div className={`mt-8 w-full overflow-hidden lg:max-h-[23rem]${
            hasMoreLines ? " poetry-fade-bottom-mask" : ""
          }`}>
            <LyricsWindow
              layout="flow"
              mode="static"
              lines={previewLines}
              showPinyin={false}
            />
          </div>

          {/* Dual CTAs — challenge (primary) + appreciation (secondary) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/challenge?poetryId=${todayPoetry.poetry.id}` as Route}
              className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-[var(--shadow-card)]"
            >
              去闯关
            </Link>
            <Link
              href={`/poetry/${todayPoetry.poetry.id}` as Route}
              className="inline-flex rounded-full border border-primary px-6 py-3 text-sm font-medium text-primary transition-all duration-300 hover:bg-primary/5 hover:shadow-[var(--shadow-card)]"
            >
              赏析
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
