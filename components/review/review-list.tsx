import Link from "next/link";
import type { Route } from "next";

import type { ReviewBuckets, ReviewStateSnapshot } from "@/lib/review/scheduler";

type ReviewListProps = {
  buckets: ReviewBuckets;
  suggestedCount: number;
  upcomingCount: number;
};

function ReviewCard({
  item,
  badge,
}: {
  item: ReviewStateSnapshot;
  badge?: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/80 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-medium">{item.title}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{item.author}</p>
        </div>
        {badge ? (
          <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs tracking-[0.2em] text-[var(--color-muted)] uppercase">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
        {item.previewLine}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--color-muted)]">
        <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
          熟练度 {item.mastery}
        </span>
        <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
          错题 {item.wrongCount}
        </span>
        <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
          间隔 {item.currentIntervalDays} 天
        </span>
      </div>

      <Link
        href={`/poetry/${item.poetryId}` as Route}
        className="mt-5 inline-flex rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-2 text-sm transition hover:bg-white"
      >
        查看诗文
      </Link>
    </article>
  );
}

export function ReviewList({
  buckets,
  suggestedCount,
  upcomingCount,
}: ReviewListProps) {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
          <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
            今日建议
          </p>
          <p className="mt-3 text-3xl font-semibold">{suggestedCount}</p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            今天可优先复习的诗作数量。
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
          <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
            即将到期
          </p>
          <p className="mt-3 text-3xl font-semibold">{upcomingCount}</p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            未来 7 天内会进入复习池的内容。
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
          <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
            开始复习
          </p>
          <Link
            href={buckets.todayDue[0] ? (`/poetry/${buckets.todayDue[0].poetryId}` as Route) : ("/challenge" as Route)}
            className="mt-4 inline-flex rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-white transition hover:brightness-105"
          >
            {buckets.todayDue[0] ? "从第一首开始" : "先去挑战练习"}
          </Link>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            一期先用详情页与挑战页串起复习入口。
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">今日待复习</h2>
          <span className="text-sm text-[var(--color-muted)]">
            错题优先排序
          </span>
        </div>
        {buckets.todayDue.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {buckets.todayDue.map((item) => (
              <ReviewCard key={item.poetryId} item={item} badge="due" />
            ))}
          </div>
        ) : (
          <p className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/78 p-5 text-sm leading-7 text-[var(--color-muted)]">
            今日暂时没有到期复习内容，可以先去挑战页练习新诗。
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">最近错题</h2>
        {buckets.recentWrong.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {buckets.recentWrong.map((item) => (
              <ReviewCard key={item.poetryId} item={item} badge="wrong" />
            ))}
          </div>
        ) : (
          <p className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/78 p-5 text-sm leading-7 text-[var(--color-muted)]">
            目前还没有错题记录，继续保持。
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">即将到期</h2>
        {buckets.upcoming.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {buckets.upcoming.map((item) => (
              <ReviewCard key={item.poetryId} item={item} badge="soon" />
            ))}
          </div>
        ) : (
          <p className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/78 p-5 text-sm leading-7 text-[var(--color-muted)]">
            未来几天暂时没有新的到期内容。
          </p>
        )}
      </section>
    </div>
  );
}
