"use client";

import { startTransition, useState } from "react";

import type { PoetryExplanation } from "@/lib/ai/deepseek";
import type { ExplanationAudience } from "@/lib/ai/prompts";

type AiExplanationCardProps = {
  poetryId: string;
};

type LoadState = "idle" | "loading" | "error";

const audienceLabels: Record<ExplanationAudience, string> = {
  child: "儿童版",
  general: "通用版",
};

export function AiExplanationCard({ poetryId }: AiExplanationCardProps) {
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

  return (
    <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
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
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                  : "border-[var(--color-line)] bg-white/70 text-[var(--color-muted)] hover:bg-white"
              }`}
            >
              {audienceLabels[item]}
            </button>
          ))}
        </div>
      </div>

      {explanation ? (
        <div className="mt-4 space-y-4 text-sm leading-8 text-[var(--color-muted)]">
          <p>{explanation.summary}</p>
          <p>{explanation.imagery}</p>
          <p>{explanation.emotion}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-8 text-[var(--color-muted)]">
            选择版本后点击按钮，即可生成 AI 讲解。
          </p>
          <button
            type="button"
            onClick={() => loadExplanation(audience)}
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm text-[var(--color-ink)] transition hover:bg-white"
          >
            {loadState === "loading" ? "正在生成讲解..." : "加载 AI 讲解"}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs leading-6 text-[var(--color-muted)]/80">{helperMessage}</p>

      {loadState === "error" ? (
        <p className="mt-3 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-accent-soft)]/45 px-3 py-2 text-sm leading-7 text-[var(--color-muted)]">
          {errorMessage}
        </p>
      ) : null}

      {loadState === "loading" && !explanation ? (
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
          正在整理讲解，请稍等。
        </p>
      ) : null}
    </section>
  );
}
