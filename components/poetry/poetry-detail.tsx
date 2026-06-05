import Link from "next/link";
import type { Route } from "next";

import { AiExplanationCard } from "@/components/poetry/ai-explanation-card";
import { BackButton } from "@/components/poetry/back-button";
import { ImmersivePoetryStage } from "@/components/poetry/immersive-poetry-stage";
import type { PoetryDetail as PoetryDetailModel, RelatedPoetry } from "@/lib/poetry/repository";
import type { ScriptVariant } from "@/lib/poetry/script-variant";

type PoetryDetailProps = {
  poetry: PoetryDetailModel;
  relatedPoetries: RelatedPoetry[];
  initialScriptVariant: ScriptVariant;
};

export function PoetryDetail({
  poetry,
  relatedPoetries,
  initialScriptVariant,
}: PoetryDetailProps) {
  return (
    <main className="min-h-screen bg-paper px-5 py-8 text-ink-900 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {/* Top bar — navigation only */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton />

          <Link
            href={"/challenge" as Route}
            className="rounded-full border border-ink-200 bg-primary/10 px-4 py-2 text-sm text-ink-900"
          >
            进入挑战
          </Link>
        </div>

        {/* Immersive stage: poster + poetry + audio */}
        <ImmersivePoetryStage key={poetry.id} poetry={poetry} initialScriptVariant={initialScriptVariant} />

        {/* Secondary content */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          {/* Left: Tabbed panel (Translation + AI Explanation) */}
          <TabbedContentPanel poetry={poetry} />

          {/* Right: Related poems */}
          <aside>
            {/* Related poems */}
            <section className="rounded-[2rem] border border-ink-200 bg-surface/80 p-6 shadow-[var(--shadow-panel)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">相关推荐</h2>
                <span className="text-xs text-ink-400">同作者 / 同主题</span>
              </div>

              {relatedPoetries.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {relatedPoetries.map((item) => (
                    <Link
                      key={item.id}
                      href={`/poetry/${item.id}` as Route}
                      className="block rounded-[1.25rem] border border-ink-200 bg-surface/72 p-4 transition hover:bg-surface/50"
                    >
                      <p className="text-lg font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-ink-600">
                        {item.dynasty} · {item.author}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-ink-600">
                        {item.previewLine}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-8 text-ink-600">
                  暂无相关推荐。
                </p>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

/* ── Tabbed Content Panel (Translation + AI Explanation) ── */

function TabbedContentPanel({ poetry }: { poetry: PoetryDetailModel }) {
  const hasTranslation = Boolean(poetry.translation?.trim());
  const hasAnnotation = Boolean(poetry.annotation?.trim());

  return (
    <article className="rounded-[2rem] border border-ink-200 bg-surface/80 p-6 shadow-[var(--shadow-panel)]">
      {/* Translation section */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">译文与读法</h2>
          <span className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-400">
            阅读辅助
          </span>
        </div>
        {hasTranslation ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-ink-900">译文</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-8 text-ink-600">
              {poetry.translation}
            </p>
          </div>
        ) : null}

        {hasAnnotation ? (
          <div className={hasTranslation ? "mt-5" : "mt-4"}>
            <h3 className="text-sm font-medium text-ink-900">注释</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-8 text-ink-600">
              {poetry.annotation}
            </p>
          </div>
        ) : null}

        {!hasTranslation && !hasAnnotation ? (
          <p className="mt-4 text-sm leading-8 text-ink-600">
            当前还没有录入译文或注释，可先结合原文与 AI 讲解理解诗意。
          </p>
        ) : null}
      </div>

      {/* Divider */}
      <div className="my-6 h-px bg-ink-200/50" />

      {/* AI Explanation */}
      <AiExplanationCard
        poetryId={poetry.id}
        explanations={poetry.explanations}
        explainAudio={poetry.explainAudio}
        embedded
      />
    </article>
  );
}
