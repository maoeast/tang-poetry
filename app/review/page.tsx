import { cookies } from "next/headers";
import Link from "next/link";
import type { Route } from "next";

import { ReviewList } from "@/components/review/review-list";
import { buildReviewSummary, getReviewBuckets } from "@/lib/review/scheduler";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const userId = process.env.SYSTEM_USER_ID;
  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );
  const buckets = userId
    ? await getReviewBuckets({
        userId,
        scriptVariant,
      })
    : {
        todayDue: [],
        upcoming: [],
        recentWrong: [],
      };
  const summary = buildReviewSummary(buckets);

  return (
    <main className="min-h-screen bg-[var(--color-page)] px-6 py-10 text-[var(--color-ink)] sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={"/" as Route}
            className="inline-flex w-fit items-center rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:bg-white"
          >
            返回首页
          </Link>
          <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
            温故知新
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-soft)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.25),transparent_30%)]" />

          <div className="relative space-y-4">
            <h1 className="text-4xl font-semibold sm:text-5xl">温故知新</h1>
            <p className="max-w-3xl text-base leading-8 text-[var(--color-muted)]">
              今日待复习、最近错题、即将到期——按记忆曲线为你安排复习计划。
            </p>
          </div>
        </section>

        <ReviewList
          buckets={buckets}
          suggestedCount={summary.suggestedCount}
          upcomingCount={summary.upcomingCount}
        />
      </div>
    </main>
  );
}
