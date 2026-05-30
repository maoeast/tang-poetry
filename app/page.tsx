import Link from "next/link";
import type { Route } from "next";

import { TodayPoetryHero } from "@/components/home/today-poetry-hero";
import { getTodayPoetry } from "@/lib/poetry/daily";

export const dynamic = "force-dynamic";

const featureCards = [
  {
    title: "今日一诗",
    body: "已经接入 DailyPoetry 排期读取，首页会直接展示当天命中的诗歌。",
    href: "/" as Route,
    action: "查看今日一诗",
  },
  {
    title: "挑战闯关",
    body: "保留对句、作者、诗名和乱序排序四类题型的落位。",
    href: "/challenge" as Route,
    action: "进入挑战",
  },
  {
    title: "复习成长",
    body: "已接入固定调度规则、今日待复习和最近错题列表。",
    href: "/review" as Route,
    action: "开始复习",
  },
  {
    title: "我的小档案",
    body: "汇总连续学习、收藏、挑战正确率和诗人缘分榜。",
    href: "/me" as Route,
    action: "查看我的页面",
  },
];

export default async function HomePage() {
  const todayPoetry = await getTodayPoetry();

  return (
    <main className="min-h-screen bg-[var(--color-page)] text-[var(--color-ink)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-card)] p-8 shadow-[0_30px_80px_rgba(91,74,59,0.12)] backdrop-blur md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.28),transparent_28%)]" />

          <div className="relative space-y-8">
            <div className="inline-flex items-center rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm tracking-[0.2em] text-[var(--color-muted)] uppercase">
              Phase 1 Skeleton
            </div>

            <div className="max-w-3xl space-y-4">
              <p className="text-sm tracking-[0.3em] text-[var(--color-muted)] uppercase">
                Tang Poetry Learning App
              </p>
              <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
                唐诗画境
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--color-muted)] sm:text-lg">
                首页已经开始使用真实排期数据。当前版本会从数据库里的
                <code className="mx-1 rounded bg-white/70 px-2 py-1 text-sm">
                  DailyPoetry
                </code>
                读取当天诗歌，后续继续接入详情、挑战和讲解链路。
              </p>
            </div>

            {todayPoetry ? (
              <TodayPoetryHero todayPoetry={todayPoetry} />
            ) : (
              <section className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/75 p-6 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
                <div className="space-y-2">
                  <p className="text-sm tracking-[0.25em] text-[var(--color-muted)] uppercase">
                    今日一诗
                  </p>
                  <h2 className="text-2xl font-semibold">今日排期暂未生成</h2>
                  <p className="text-sm text-[var(--color-muted)]">
                    请先执行数据导入脚本，写入 Poetry 与 DailyPoetry。
                  </p>
                </div>
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/70 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]"
                >
                  <h2 className="text-xl font-medium">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {card.body}
                  </p>
                  <Link
                    href={card.href}
                    className="mt-4 inline-flex rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm"
                  >
                    {card.action}
                  </Link>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-[var(--color-accent-soft)] px-4 py-2 text-[var(--color-ink)]">
                Next.js 16
              </span>
              <span className="rounded-full bg-[var(--color-accent-soft)] px-4 py-2 text-[var(--color-ink)]">
                React 19
              </span>
              <span className="rounded-full bg-[var(--color-accent-soft)] px-4 py-2 text-[var(--color-ink)]">
                Tailwind CSS 4
              </span>
              <span className="rounded-full bg-[var(--color-accent-soft)] px-4 py-2 text-[var(--color-ink)]">
                单用户口令访问
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
