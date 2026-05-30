import Link from "next/link";
import type { Route } from "next";

import { AiExplanationCard } from "@/components/poetry/ai-explanation-card";
import { ImmersivePoetryStage } from "@/components/poetry/immersive-poetry-stage";
import type { PoetryDetail as PoetryDetailModel, RelatedPoetry } from "@/lib/poetry/repository";

type PoetryDetailProps = {
  poetry: PoetryDetailModel;
  relatedPoetries: RelatedPoetry[];
};

export function PoetryDetail({ poetry, relatedPoetries }: PoetryDetailProps) {
  return (
    <main className="min-h-screen bg-[var(--color-page)] px-5 py-8 text-[var(--color-ink)] sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={"/" as Route}
            className="inline-flex w-fit items-center rounded-full border border-[var(--color-line)] bg-white/72 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:bg-white"
          >
            返回首页
          </Link>

          <Link
            href={"/challenge" as Route}
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm text-[var(--color-ink)]"
          >
            进入挑战
          </Link>
        </div>

        <ImmersivePoetryStage poetry={poetry} />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">译文与读法</h2>
              <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-3 py-1 text-xs tracking-[0.16em] text-[var(--color-muted)] uppercase">
                阅读辅助
              </span>
            </div>

            <p className="mt-5 text-sm leading-8 text-[var(--color-muted)]">
              {poetry.translation ?? "当前还没有录入译文，可先结合原文与 AI 讲解理解诗意。"}
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-accent-soft)]/55 p-5">
              <h3 className="text-lg font-medium">阅读提示</h3>
              <p className="mt-3 text-sm leading-8 text-[var(--color-muted)]">
                {poetry.audio.audioStatus === "none"
                  ? "当前详情页没有音频，已自动退化为手动逐句模式。你可以按句推进，再按需展开拼音。"
                  : "音频播放时会自动滚动并高亮当前诗句；拼音默认隐藏，建议先听原句，再按需展开。"}
              </p>
            </div>
          </article>

          <aside className="space-y-6">
            <AiExplanationCard poetryId={poetry.id} />

            <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">相关推荐</h2>
                <span className="text-sm text-[var(--color-muted)]">同作者 / 同主题</span>
              </div>

              {relatedPoetries.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {relatedPoetries.map((item) => (
                    <Link
                      key={item.id}
                      href={`/poetry/${item.id}` as Route}
                      className="block rounded-[1.25rem] border border-[var(--color-line)] bg-white/72 p-4 transition hover:bg-white"
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
                  暂无相关推荐，后续会继续补充同作者与同题材作品。
                </p>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
