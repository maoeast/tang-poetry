"use client";

import { startTransition, useState } from "react";

import type { PoetryExplanation } from "@/lib/ai/deepseek";
import type { ExplanationAudience } from "@/lib/ai/prompts";

type AiExplanationCardProps = {
  poetryId: string;
  /** When true, renders without the outer card wrapper (for embedding in tab panels) */
  embedded?: boolean;
};

type LoadState = "idle" | "loading" | "error";

const audienceLabels: Record<ExplanationAudience, string> = {
  child: "儿童版",
  general: "通用版",
};

export function AiExplanationCard({ poetryId, embedded }: AiExplanationCardProps) {
  const [audience, setAudience] = useState<ExplanationAudience>("child");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [explanations, setExplanations] = useState<
    Partial<Record<ExplanationAudience, PoetryExplanation>>
  >({});

  const explanation = explanations[audience];
  const helperMessage = explanation
    ? "讲解已加载，可以随时切换版本。"
    : "点击按钮加载 AI 讲解。";

  function loadExplanation(nextAudience: ExplanationAudience) {
    startTransition(async () => {
      setAudience(nextAudience);

      if (explanations[nextAudience]) {
        setLoadState("idle");
        setErrorMessage("");
        return;
      }

      setLoadState("loading");
      setErrorMessage("");

      try {
        const response = await fetch("/api/ai/explain", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poetryId,
            audience: nextAudience,
          }),
        });

        if (!response.ok) {
          throw new Error("request_failed");
        }

        const data = (await response.json()) as PoetryExplanation;

        setExplanations((current) => ({
          ...current,
          [nextAudience]: data,
        }));
        setLoadState("idle");
      } catch {
        setLoadState("error");
        setErrorMessage("讲解暂时没有加载成功，稍后再试也可以。");
      }
    });
  }

  const content = (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">AI 讲解</h2>
        <div className="flex gap-2">
          {(["child", "general"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => loadExplanation(item)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                audience === item
                  ? "border-primary bg-primary/10 text-ink-900"
                  : "border-ink-200 bg-surface/70 text-ink-600 hover:bg-surface/50"
              }`}
            >
              {audienceLabels[item]}
            </button>
          ))}
        </div>
      </div>

      {explanation ? (
        <div className="mt-4 space-y-4 text-sm leading-8 text-ink-600">
          <p>{explanation.summary}</p>
          <p>{explanation.imagery}</p>
          <p>{explanation.emotion}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-8 text-ink-600">
            选择版本后点击按钮，即可生成 AI 讲解。
          </p>
          <button
            type="button"
            onClick={() => loadExplanation(audience)}
            className="rounded-full border border-ink-200 bg-primary/10 px-4 py-2 text-sm text-ink-900 transition hover:bg-surface/50"
          >
            {loadState === "loading" ? "正在生成讲解..." : "加载 AI 讲解"}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs leading-6 text-ink-600/80">{helperMessage}</p>

      {loadState === "error" ? (
        <p className="mt-3 rounded-[1rem] border border-ink-200 bg-primary/10/45 px-3 py-2 text-sm leading-7 text-ink-600">
          {errorMessage}
        </p>
      ) : null}

      {loadState === "loading" && !explanation ? (
        <p className="mt-4 text-sm leading-7 text-ink-600">
          正在整理讲解，请稍等。
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="rounded-[2rem] border border-ink-200 bg-surface/78 p-6 shadow-[var(--shadow-panel)]">
      {content}
    </section>
  );
}
