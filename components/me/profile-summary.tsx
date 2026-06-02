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
  const bannerAccent = champion
    ? `与 ${champion.author} 相遇 ${champion.count} 次`
    : "从今日一诗开始写下第一笔相遇";

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
            我的小档案
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-soft)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.34),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.3),transparent_34%)]" />
          <div className="pointer-events-none absolute inset-y-8 left-8 hidden w-px bg-[linear-gradient(to_bottom,rgba(126,103,81,0.02),rgba(126,103,81,0.22),rgba(126,103,81,0.02))] lg:block" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_18rem]">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
                <span className="rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2">
                  卷名：诗心小档案
                </span>
                <span className="rounded-full border border-[var(--color-line)] bg-white/55 px-4 py-2">
                  小景：山色入卷，风声留痕
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-sm tracking-[0.28em] text-[var(--color-muted)] uppercase">
                  个人长卷
                </p>
                <h1 className="text-4xl font-semibold sm:text-5xl">读诗长卷</h1>
                <p className="max-w-3xl text-base leading-8 text-[var(--color-muted)]">
                  你最近读过、练过、收藏过的诗作都在这里，像一轴慢慢展开的小长卷。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/65 px-5 py-4">
                  <p className="text-xs tracking-[0.2em] text-[var(--color-muted)] uppercase">
                    卷首题记
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {bannerAccent}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/65 px-5 py-4">
                  <p className="text-xs tracking-[0.2em] text-[var(--color-muted)] uppercase">
                    行路节奏
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    连续学习 {summary.streakDays} 天，读诗手感在日常里慢慢接上。
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/65 px-5 py-4">
                  <p className="text-xs tracking-[0.2em] text-[var(--color-muted)] uppercase">
                    下一步
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    保留挑战与复习入口，方便从卷首继续往下练。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/72 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
              <p className="text-sm tracking-[0.2em] text-[var(--color-muted)] uppercase">
                临卷手感
              </p>
              <p className="mt-4 text-5xl font-semibold text-[var(--color-accent)]">
                {summary.challengeAccuracy}%
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                共完成 {summary.challengeAttemptCount} 次挑战作答。
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article
              key={card.key}
              className="relative overflow-hidden rounded-[1.75rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]"
            >
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${card.tone}`} />
              <div className="relative">
                <p className="text-sm tracking-[0.18em] text-[var(--color-muted)] uppercase">
                  {card.label}
                </p>
                <p className="mt-6 text-4xl font-semibold">
                  {summary[card.key]}
                  <span className="ml-2 text-base font-normal text-[var(--color-muted)]">
                    {card.suffix}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-8 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
                  诗人缘分
                </p>
                <h2 className="mt-3 text-2xl font-semibold">诗人缘分榜</h2>
              </div>
              <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm text-[var(--color-muted)]">
                前 5 位
              </span>
            </div>

            {affinity.length > 0 ? (
              <div className="mt-6 space-y-3">
                {affinity.map((item, index) => (
                  <div
                    key={item.author}
                    className="flex items-center gap-4 rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-medium text-[var(--color-muted)]">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-medium">{item.author}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        相遇 {item.count} 次
                      </p>
                    </div>
                    <div className="h-3 w-24 overflow-hidden rounded-full bg-[rgba(126,103,81,0.1)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{
                          width: `${Math.max(
                            20,
                            Math.round((item.count / Math.max(champion?.count ?? 1, 1)) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm leading-8 text-[var(--color-muted)]">
                还没有形成缘分榜。先去读几首诗，系统就会按学习记录自动统计你最常相遇的诗人。
              </p>
            )}
          </article>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
              <p className="text-sm tracking-[0.2em] text-[var(--color-muted)] uppercase">
                今日提示
              </p>
              <h2 className="mt-3 text-2xl font-semibold">把点亮感留住</h2>
              <p className="mt-4 text-sm leading-8 text-[var(--color-muted)]">
                连续学习天数会按照最近的学习事件自动累计，中断一天后重新开始。收藏和挑战数据也会在这里同步更新。
              </p>
            </section>

            <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={"/challenge" as Route}
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm"
                >
                  去挑战
                </Link>
                <Link
                  href={"/review" as Route}
                  className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm"
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
