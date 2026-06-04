import Link from "next/link";
import { cookies } from "next/headers";
import type { Route } from "next";

import { TodayPoetryHero } from "@/components/home/today-poetry-hero";
import { getTodayPoetry } from "@/lib/poetry/daily";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";
import { getWeeklyCheckIn } from "@/lib/stats/weekly-checkin";

export const dynamic = "force-dynamic";

const featureCards = [
  {
    title: "诗歌分类",
    description: "按体裁、题材浏览唐诗",
    href: "/browse" as Route,
  },
  {
    title: "顺序全集",
    description: "按编号 001–366 系统学习",
    href: "/browse?sort=sequential" as Route,
  },
  {
    title: "挑战闯关",
    description: "诗词知识趣味问答",
    href: "/challenge" as Route,
  },
  {
    title: "复习成长",
    description: "间隔复习巩固记忆",
    href: "/review" as Route,
  },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );

  const [todayPoetry, weeklyCheckIn] = await Promise.all([
    getTodayPoetry(undefined, undefined, { scriptVariant }),
    getWeeklyCheckIn(process.env.SYSTEM_USER_ID ?? "family-001"),
  ]);

  // Derive today's check-in status from weekly data (last non-future day = today)
  const todayCheckedIn =
    [...weeklyCheckIn.days].reverse().find((d) => !d.isFuture)?.isChecked ??
    false;

  return (
    <main className="min-h-screen bg-paper text-ink-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="relative overflow-hidden rounded-[2rem] border border-ink-200 bg-surface p-8 shadow-[0_30px_80px_rgba(91,74,59,0.12)] backdrop-blur md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.28),transparent_28%)]" />

          <div className="relative space-y-8">
            {/* Header: Title + Profile avatar */}
            <div className="flex max-w-3xl items-start justify-between">
              <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
                唐诗画境
              </h1>
              <Link
                href={"/me" as Route}
                className="relative flex items-center justify-center transition-opacity duration-300 hover:opacity-70"
                aria-label="我的"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/5 text-ink-500">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.2" />
                    <path
                      d="M2.5 14.5C2.5 11.5 5 10 8 10C11 10 13.5 11.5 13.5 14.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                {/* Check-in status dot: green = today checked in, grey = not yet */}
                <span
                  className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${
                    todayCheckedIn ? "bg-emerald-500" : "bg-ink-200"
                  }`}
                />
              </Link>
            </div>

            {/* Today's poem hero */}
            {todayPoetry ? (
              <div id="today-poetry">
                <TodayPoetryHero
                  todayPoetry={todayPoetry}
                  weeklyCheckIn={weeklyCheckIn}
                />
              </div>
            ) : (
              <section className="rounded-[1.75rem] border border-ink-200 bg-surface/75 p-6 shadow-[var(--shadow-card)]">
                <div className="space-y-2">
                  <p className="text-sm tracking-[0.25em] text-ink-600 uppercase">
                    今日一诗
                  </p>
                  <h2 className="text-2xl font-semibold">今日诗歌即将上线</h2>
                  <p className="text-sm text-ink-600">
                    今天的诗歌正在准备中，请稍后再来看看。
                  </p>
                </div>
              </section>
            )}

            {/* Feature cards — 2×2 grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {featureCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-[1.5rem] border border-ink-200 bg-surface/70 p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]"
                >
                  <article className="flex items-start gap-3.5">
                    {/* Ink-stroke icon — classical Chinese aesthetic */}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900/5 text-ink-400" aria-hidden="true">
                      {card.title === "诗歌分类" && (
                        /* 竹简 — bamboo slips */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="6" y1="3" x2="6" y2="21" />
                          <line x1="12" y1="3" x2="12" y2="21" />
                          <line x1="18" y1="3" x2="18" y2="21" />
                          <line x1="4" y1="7" x2="20" y2="7" />
                          <line x1="4" y1="12" x2="20" y2="12" />
                          <line x1="4" y1="17" x2="20" y2="17" />
                        </svg>
                      )}
                      {card.title === "顺序全集" && (
                        /* 卷轴 — scroll */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 5h14v14H5z" />
                          <path d="M5 5c-1.5 0-2 1-2 2s.5 2 2 2" />
                          <path d="M5 19c-1.5 0-2-1-2-2s.5-2 2-2" />
                          <path d="M19 5c1.5 0 2 1 2 2s-.5 2-2 2" />
                          <path d="M19 19c1.5 0 2-1 2-2s-.5-2-2-2" />
                          <line x1="8" y1="9" x2="16" y2="9" />
                          <line x1="8" y1="12" x2="14" y2="12" />
                          <line x1="8" y1="15" x2="12" y2="15" />
                        </svg>
                      )}
                      {card.title === "挑战闯关" && (
                        /* 毛笔 — brush pen */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3L7 13l-1 5 5-1L21 7" />
                          <path d="M14 6l4 4" />
                          <path d="M7 13c-1 1.5-2.5 3-4 3 1.5.5 3 2 3 4" />
                        </svg>
                      )}
                      {card.title === "复习成长" && (
                        /* 新芽 — sprout */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22V10" />
                          <path d="M12 10c-2-2-6-3-8-1 0 4 3 6 8 6" />
                          <path d="M12 6c2-2 5-3 8-1 0 4-3 7-8 7" />
                          <path d="M8 20h8" />
                        </svg>
                      )}
                    </span>
                    <div>
                      <h2 className="text-xl font-medium">{card.title}</h2>
                      <p className="mt-1 text-sm text-ink-400">{card.description}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
