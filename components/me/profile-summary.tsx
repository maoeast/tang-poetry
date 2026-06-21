import Link from "next/link";
import type { Route } from "next";

import { PoetryCard } from "@/components/browse/poetry-card";
import type { BrowsePoem } from "@/lib/browse/repository";
import { getAuthorAvatarUrl } from "@/lib/author/repository";
import type { MyPageSummary, PoetAffinity } from "@/lib/stats/affinity";

type ProfileSummaryProps = {
  summary: MyPageSummary;
  affinity: PoetAffinity[];
  favorites: BrowsePoem[];
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

export function ProfileSummary({ summary, affinity, favorites }: ProfileSummaryProps) {
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

        {/* 我的收藏 — favorite poems grid */}
        <section className="rounded-[2rem] border border-ink-200 bg-surface/78 p-8 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">我的收藏</h2>
            <span className="text-sm text-ink-500">{favorites.length} 首</span>
          </div>

          {favorites.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((poem) => (
                <PoetryCard key={poem.id} poem={poem} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm leading-8 text-ink-600">
              暂无收藏，去{" "}
              <Link
                href={"/browse" as Route}
                className="text-ink-900 underline underline-offset-4 hover:text-ink-700"
              >
                浏览诗词
              </Link>{" "}
              收藏喜欢的作品吧。
            </p>
          )}
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <article className="rounded-[2rem] border border-ink-200 bg-surface/78 p-8 shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">诗人缘分</h2>
            </div>

            {affinity.length > 0 ? (
              <div className="mt-6 space-y-3">
                {affinity.map((item) => {
                  const avatarUrl = getAuthorAvatarUrl(item.author);
                  const hasAvatar = !avatarUrl.endsWith("/default.svg");

                  return (
                  <div
                    key={item.author}
                    className="flex items-center gap-4 rounded-[1.5rem] border border-ink-200 bg-surface px-5 py-4"
                  >
                    <Link
                      href={`/author/${encodeURIComponent(item.author)}` as Route}
                      className="shrink-0"
                    >
                      {hasAvatar ? (
                        <img
                          src={avatarUrl}
                          alt={item.author}
                          className="h-11 w-11 rounded-full object-cover transition-opacity hover:opacity-80"
                        />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900/5 text-xs font-serif text-ink-400">
                          {item.author.slice(0, 2)}
                        </span>
                      )}
                    </Link>
                    <div className="flex-1">
                      <p className="text-lg font-medium">{item.author}</p>
                    </div>
                    <div className="h-3 w-24 overflow-hidden rounded-full bg-[rgba(126,103,81,0.1)]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            20,
                            Math.round((item.count / Math.max(affinity[0]?.count ?? 1, 1)) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-ink-600">{item.count}</span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-sm text-ink-600">
                暂无学习记录
              </p>
            )}
          </article>

          <aside>
            <section className="rounded-[2rem] border border-ink-200 bg-surface/78 p-6 shadow-[var(--shadow-panel)]">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={"/challenge" as Route}
                  className="rounded-full bg-primary px-4 py-2 text-sm text-white"
                >
                  去闯关
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
