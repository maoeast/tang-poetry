"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import type { PoetryExplanation } from "@/lib/ai/deepseek";
import type { ExplanationAudience } from "@/lib/ai/prompts";
import type { ExplanationAudioInfo } from "@/lib/poetry/repository";

type AiExplanationCardProps = {
  poetryId: string;
  /** Pre-cached explanations from DB, keyed by audience */
  explanations: Partial<Record<ExplanationAudience, PoetryExplanation>>;
  /** Pre-computed audio info per audience */
  explainAudio: Record<ExplanationAudience, ExplanationAudioInfo>;
  /** When true, renders without the outer card wrapper (for embedding in tab panels) */
  embedded?: boolean;
};

type LoadState = "idle" | "loading" | "error";

const audienceLabels: Record<ExplanationAudience, string> = {
  child: "儿童版",
  general: "通用版",
};

const AUDIENCES: ExplanationAudience[] = ["child", "general"];

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AiExplanationCard({
  poetryId,
  explanations: initialExplanations,
  explainAudio,
  embedded,
}: AiExplanationCardProps) {
  const [audience, setAudience] = useState<ExplanationAudience>(() => {
    // Default to child if it has cached data, otherwise general
    return initialExplanations.child ? "child" : "general";
  });
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [explanations, setExplanations] =
    useState<Partial<Record<ExplanationAudience, PoetryExplanation>>>(initialExplanations);

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const explanation = explanations[audience];
  const audioInfo = explainAudio[audience];
  const hasAudio = audioInfo?.exists === true;

  // Sync audio element when audience changes or explanation loads
  useEffect(() => {
    const currentAudio = audioRef.current;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio.load();
      audioRef.current = null;
    }

    startTransition(() => {
      setIsPlaying(false);
      setCurrentTimeMs(0);
      setDurationMs(0);
    });

    if (!hasAudio || !audioInfo?.url) {
      return;
    }

    const nextAudio = new Audio();
    nextAudio.preload = "metadata";

    const handleTimeUpdate = () => {
      setCurrentTimeMs(Math.floor(nextAudio.currentTime * 1000));
    };
    const handleLoadedMetadata = () => {
      if (Number.isFinite(nextAudio.duration) && nextAudio.duration > 0) {
        setDurationMs(Math.floor(nextAudio.duration * 1000));
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTimeMs(Math.floor(nextAudio.duration * 1000));
    };

    nextAudio.addEventListener("timeupdate", handleTimeUpdate);
    nextAudio.addEventListener("loadedmetadata", handleLoadedMetadata);
    nextAudio.addEventListener("durationchange", handleLoadedMetadata);
    nextAudio.addEventListener("play", handlePlay);
    nextAudio.addEventListener("pause", handlePause);
    nextAudio.addEventListener("ended", handleEnded);

    nextAudio.src = audioInfo.url;
    audioRef.current = nextAudio;

    return () => {
      nextAudio.pause();
      nextAudio.removeEventListener("timeupdate", handleTimeUpdate);
      nextAudio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      nextAudio.removeEventListener("durationchange", handleLoadedMetadata);
      nextAudio.removeEventListener("play", handlePlay);
      nextAudio.removeEventListener("pause", handlePause);
      nextAudio.removeEventListener("ended", handleEnded);
      nextAudio.removeAttribute("src");
      nextAudio.load();
      if (audioRef.current === nextAudio) {
        audioRef.current = null;
      }
    };
  }, [audience, hasAudio, audioInfo?.url]);

  function switchAudience(nextAudience: ExplanationAudience) {
    setAudience(nextAudience);

    if (explanations[nextAudience]) {
      setLoadState("idle");
      setErrorMessage("");
      return;
    }

    loadExplanation(nextAudience);
  }

  function loadExplanation(targetAudience: ExplanationAudience) {
    startTransition(async () => {
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
            audience: targetAudience,
          }),
        });

        if (!response.ok) {
          throw new Error("request_failed");
        }

        const data = (await response.json()) as PoetryExplanation;

        setExplanations((current) => ({
          ...current,
          [targetAudience]: data,
        }));
        setLoadState("idle");
      } catch {
        setLoadState("error");
        setErrorMessage("讲解暂时没有加载成功，稍后再试也可以。");
      }
    });
  }

  async function toggleAudioPlayPause() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (audio.ended) {
        audio.currentTime = 0;
      }
      try {
        await audio.play();
      } catch {
        // AbortError / NotAllowedError
      }
    } else {
      audio.pause();
    }
  }

  function seekAudio(ratio: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const targetMs = Math.max(0, Math.min(1, ratio)) * durationMs;
    audio.currentTime = targetMs / 1000;
    setCurrentTimeMs(targetMs);
  }

  const progress = durationMs > 0 ? Math.min(currentTimeMs / durationMs, 1) : 0;

  const content = (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">AI 讲解</h2>
        <div className="flex gap-2">
          {AUDIENCES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchAudience(item)}
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

      {/* Explanation text — show immediately if cached */}
      {explanation ? (
        <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-600">
          <p>{explanation.summary}</p>
          <p>{explanation.imagery}</p>
          <p>{explanation.emotion}</p>
        </div>
      ) : loadState === "loading" ? (
        <div className="mt-4">
          <p className="text-base leading-relaxed text-ink-600">
            正在整理讲解，请稍等。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-base leading-relaxed text-ink-600">
            点击按钮加载 AI 讲解。
          </p>
          <button
            type="button"
            onClick={() => loadExplanation(audience)}
            className="rounded-full border border-ink-200 bg-primary/10 px-4 py-2 text-sm text-ink-900 transition hover:bg-surface/50"
          >
            加载 AI 讲解
          </button>
        </div>
      )}

      {/* Inline audio player for explanation */}
      {hasAudio && explanation ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-[1.25rem] border border-ink-200 bg-surface/60 px-3 py-2">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={() => void toggleAudioPlayPause()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:brightness-105"
            aria-label={isPlaying ? "暂停讲解" : "播放讲解"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 ml-0.5">
                <path fillRule="evenodd" d="M5.636 4.575a.75.75 0 0 1 .764-.04l12.5 7.5a.75.75 0 0 1 0 1.29l-12.5 7.5A.75.75 0 0 1 5 20.25V5.543a.75.75 0 0 1 .636-.968Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div
            className="group relative flex h-5 flex-1 cursor-pointer items-center"
            role="slider"
            aria-label="讲解播放进度"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
              seekAudio(ratio);
            }}
          >
            <div className="h-1 w-full rounded-full bg-ink-200/60">
              <div
                className="h-full rounded-full bg-primary/50 transition-[width] duration-150 group-hover:bg-primary/70"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div
              className="absolute h-3 w-3 rounded-full bg-primary shadow-sm transition-[left] duration-150 group-hover:scale-125"
              style={{ left: `calc(${progress * 100}% - 6px)` }}
            />
          </div>

          {/* Time display */}
          <span className="shrink-0 text-[11px] tabular-nums text-ink-400">
            {formatTime(currentTimeMs)}/{formatTime(durationMs)}
          </span>
        </div>
      ) : null}

      {loadState === "error" ? (
        <p className="mt-3 rounded-[1rem] border border-ink-200 bg-primary/10/45 px-3 py-2 text-base leading-relaxed text-ink-600">
          {errorMessage}
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
