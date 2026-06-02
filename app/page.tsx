import Link from "next/link";
import { cookies } from "next/headers";
import type { Route } from "next";

import { TodayPoetryHero } from "@/components/home/today-poetry-hero";
import { getTodayPoetry } from "@/lib/poetry/daily";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

export const dynamic = "force-dynamic";

const featureCards = [
  {
    title: "诗歌分类",
    href: "/browse" as Route,
    action: "浏览诗歌",
  },
  {
    title: "今日一诗",
    href: "/#today-poetry" as Route,
    action: "查看今日一诗",
  },
  {
    title: "挑战闯关",
    href: "/challenge" as Route,
    action: "进入挑战",
  },
  {
    title: "复习成长",
    href: "/review" as Route,
    action: "开始复习",
  },
  {
    title: "我的小档案",
    href: "/me" as Route,
    action: "查看我的页面",
  },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );
  const todayPoetry = await getTodayPoetry(undefined, undefined, {
    scriptVariant,
  });

  return (
    <main className="min-h-screen bg-paper text-ink-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="relative overflow-hidden rounded-[2rem] border border-ink-200 bg-surface p-8 shadow-[0_30px_80px_rgba(91,74,59,0.12)] backdrop-blur md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.28),transparent_28%)]" />

          <div className="relative space-y-8">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
                唐诗画境
              </h1>

            </div>

            {todayPoetry ? (
              <div id="today-poetry">
                <TodayPoetryHero todayPoetry={todayPoetry} />
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[1.5rem] border border-ink-200 bg-surface/70 p-5 shadow-[var(--shadow-card)]"
                >
                  <h2 className="text-xl font-medium">{card.title}</h2>

                  <Link
                    href={card.href}
                    className="mt-4 inline-flex rounded-full border border-ink-200 bg-primary/10 px-4 py-2 text-sm"
                  >
                    {card.action}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
