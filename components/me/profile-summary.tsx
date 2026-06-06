import Link from "next/link";
import type { Route } from "next";

import type { MyPageSummary, PoetAffinity } from "@/lib/stats/affinity";

type ProfileSummaryProps = {
  summary: MyPageSummary;
  affinity: PoetAffinity[];
};

const statCards = [
  {
    key: "streakDays",
    label: "连续学习",
    suffix: "天",
    tone: "from-[#e7c38f]/70 to-transparent",
  },
  {
    key: "viewedPoetryCount",
    label: "读过诗作",
    suffix: "首",
    tone: "from-[#bfd5c8]/70 to-transparent",
  },
  {
    key: "favoriteCount",
    label: "已收藏",
    suffix: "首",
    tone: "from-[#f0d7b2]/70 to-transparent",
  },
  {
    key: "challengeAccuracy",
    label: "挑战正确率",
    suffix: "%",
    tone: "from-[#d8c2a3]/70 to-transparent",
  },
] as const satisfies Array<{
  key: keyof MyPageSummary;
  label: string;
  suffix: string;
  tone: string;
}>;

export function ProfileSummary({ summary, affinity }: ProfileSummaryProps) {
  const champion = affinity[0];

  return (
    <main className="min-h-screen bg-paper px-6 py-10 text-ink-900 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={"/" as Route}
            className="inline-flex w-fit items-center rounded-full border border-ink-200 bg-surface/70 px-4 py-2 text-sm text-ink-600 transition hover:bg-surface/50"
          >
            返回首页
          </Link>
          <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
            我的
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article
              key={card.key}
              className="relative overflow-hidden rounded-[1.75rem] border border-ink-200 bg-surface/78 p-6 shadow-[var(--shadow-panel)]"
            >
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${card.tone}`} />
              <div className="relative">
                <p className="text-sm tracking-[0.18em] text-ink-600 uppercase">
                  {card.label}
                </p>
                <p className="mt-6 text-4xl font-semibold">
                  {summary[card.key]}
                  <span className="ml-2 text-base font-normal text-ink-600">
                    {card.suffix}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <article className="rounded-[2rem] border border-ink-200 bg-surface/78 p-8 shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">诗人缘分</h2>
              {affinity.length > 0 && (
                <span className="rounded-full border border-ink-200 px-4 py-2 text-sm text-ink-600">
                  共 {champion!.count} 次相遇
                </span>
              )}
            </div>

            {affinity.length > 0 ? (
              <div className="mt-6 space-y-3">
                {affinity.map((item, index) => (
                  <div
                    key={item.author}
                    className="flex items-center gap-4 rounded-[1.5rem] border border-ink-200 bg-surface px-5 py-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-ink-600">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-medium">{item.author}</p>
                    </div>
                    <div className="h-3 w-24 overflow-hidden rounded-full bg-[rgba(126,103,81,0.1)]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            20,
                            Math.round((item.count / Math.max(champion?.count ?? 1, 1)) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-ink-600">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-ink-600">
                还没有学习记录，去读几首诗就会自动统计。
              </p>
            )}
          </article>

          <aside>
            <section className="rounded-[2rem] border border-ink-200 bg-surface/78 p-6 shadow-[var(--shadow-panel)]">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={"/challenge" as Route}
                  className="rounded-full border border-ink-200 bg-primary/10 px-4 py-2 text-sm"
                >
                  去挑战
                </Link>
                <Link
                  href={"/review" as Route}
                  className="rounded-full border border-ink-200 bg-surface px-4 py-2 text-sm"
                >
                  去复习
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
