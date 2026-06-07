import Link from "next/link";
import { cookies } from "next/headers";
import type { Route } from "next";

import { TodayPoetryHero } from "@/components/home/today-poetry-hero";
import { SearchInput } from "@/components/browse/search-input";
import { getTodayPoetry } from "@/lib/poetry/daily";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";
import { getWeeklyCheckIn } from "@/lib/stats/weekly-checkin";

export const dynamic = "force-dynamic";

const featureCards = [
  {
    title: "古诗三百",
    description: "先秦至清，二百七十八首",
    href: "/browse?source=gs300" as Route,
  },
  {
    title: "唐诗三百",
    description: "李杜王孟，三百首精粹",
    href: "/browse?source=ts300" as Route,
  },
  {
    title: "宋词精选",
    description: "浅斟低唱，婉约豪放兼收",
    href: "/browse?source=sc200" as Route,
  },
  {
    title: "场景时令",
    description: "春花秋月，朝暮四时",
    href: "/browse?mode=scene" as Route,
  },
  {
    title: "挑战闯关",
    description: "以诗会友，试锋文墨之间",
    href: "/challenge" as Route,
  },
  {
    title: "复习成长",
    description: "温故知新，让诗词留在心里",
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
            {/* Header: Title + Search + Profile */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
                诗笺阁
              </h1>
              <p className="mt-2 text-sm tracking-[0.24em] text-ink-500/80">
                展一纸笺，入诗词之境
              </p>
              <div className="flex items-center gap-3">
                <SearchInput />
                <Link
                  href={"/me" as Route}
                  className="relative flex items-center justify-center transition-opacity duration-300 hover:opacity-70 shrink-0"
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

            {/* Feature cards — 六宫格: 2-col mobile, 3-col desktop */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {featureCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-[1.5rem] border border-ink-200 bg-surface/70 p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]"
                >
                  <article className="flex items-start gap-3.5">
                    {/* Ink-stroke icon — classical Chinese aesthetic */}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900/5 text-ink-400" aria-hidden="true">
                      {card.title === "古诗三百" && (
                        /* 远山 — distant mountains (ancient times) */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 20l6-8 4 4 5-7 5 11H2z" />
                          <path d="M14 4l2-2 2 2" />
                        </svg>
                      )}
                      {card.title === "唐诗三百" && (
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
                      {card.title === "宋词精选" && (
                        /* 花月 — flower and moon (ci poetry aesthetics) */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="17" cy="7" r="3" />
                          <path d="M17 4v-1" />
                          <path d="M17 10v1" />
                          <path d="M14 7h-1" />
                          <path d="M20 7h1" />
                          <path d="M6 21c-2 0-3-1.5-3-3 0-2 2-3 4-3s4 1 4 3c0 1.5-1 3-3 3" />
                          <path d="M7 12v-1" />
                          <path d="M10 14l1-1" />
                          <path d="M4 14l-1-1" />
                        </svg>
                      )}
                      {card.title === "场景时令" && (
                        /* 四季 — four seasons (sun + cloud) */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="10" cy="8" r="3" />
                          <path d="M10 3v1" />
                          <path d="M10 12v1" />
                          <path d="M5 8H4" />
                          <path d="M15 8h1" />
                          <path d="M18 18H7a3 3 0 01-.4-6 4 4 0 018-1.2A3.5 3.5 0 0118 18z" />
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
