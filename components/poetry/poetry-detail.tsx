import Link from "next/link";
import type { Route } from "next";

import type { PoetryDetail, RelatedPoetry } from "@/lib/poetry/repository";
import { AiExplanationCard } from "@/components/poetry/ai-explanation-card";

type PoetryDetailProps = {
  poetry: PoetryDetail;
  relatedPoetries: RelatedPoetry[];
};

export function PoetryDetail({ poetry, relatedPoetries }: PoetryDetailProps) {
  return (
    <main className="min-h-screen bg-[var(--color-page)] px-6 py-10 text-[var(--color-ink)] sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <Link
          href={"/" as Route}
          className="inline-flex w-fit items-center rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:bg-white"
        >
          返回首页
        </Link>

        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-soft)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.25),transparent_30%)]" />

          <div className="relative space-y-6">
            <div className="space-y-3">
              <p className="text-sm tracking-[0.28em] text-[var(--color-muted)] uppercase">
                Poetry Detail
              </p>
              <h1 className="text-4xl font-semibold sm:text-5xl">{poetry.title}</h1>
              <p className="text-base text-[var(--color-muted)]">
                {poetry.dynasty} · {poetry.author}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/60 p-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs tracking-[0.2em] text-[var(--color-muted)] uppercase">
                  {poetry.imageStatus === "ready" ? "已接入配图" : "插画占位中"}
                </span>
                {poetry.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-[var(--color-line)] bg-white/70 px-3 py-1 text-sm"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
          <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-8 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">全文</h2>
              <span className="rounded-full border border-dashed border-[var(--color-line)] px-3 py-1 text-sm text-[var(--color-muted)]">
                拼音开关待接入
              </span>
            </div>

            <div className="space-y-4 text-lg leading-10">
              {poetry.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            {poetry.pinyin.length > 0 ? (
              <div className="mt-8 rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-accent-soft)] p-5">
                <h3 className="text-lg font-medium">拼音预留</h3>
                <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-muted)]">
                  {poetry.pinyin.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
              <h2 className="text-xl font-semibold">译文</h2>
              <p className="mt-4 text-sm leading-8 text-[var(--color-muted)]">
                {poetry.translation ?? "一期先展示诗文原文，译文内容稍后补录。"}
              </p>
            </section>

            <AiExplanationCard poetryId={poetry.id} />

            <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">相关推荐</h2>
                <Link
                  href={"/challenge" as Route}
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm"
                >
                  进入挑战
                </Link>
              </div>

              {relatedPoetries.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {relatedPoetries.map((item) => (
                    <Link
                      key={item.id}
                      href={`/poetry/${item.id}` as Route}
                      className="block rounded-[1.25rem] border border-[var(--color-line)] bg-white/70 p-4 transition hover:bg-white"
                    >
                      <p className="text-lg font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {item.dynasty} · {item.author}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                        {item.previewLine}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-8 text-[var(--color-muted)]">
                  暂无推荐作品，后续会补充同作者与同主题扩展阅读。
                </p>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
