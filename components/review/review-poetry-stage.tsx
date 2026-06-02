"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { LyricsWindow } from "@/components/lyrics/lyrics-window";
import { PoetryPoster } from "@/components/poster/poetry-poster";
import { PosterStatusBadge } from "@/components/poster/poster-status-badge";
import { PosterTitleBlock } from "@/components/poster/poster-title-block";
import { getLineStartMs } from "@/lib/audio/timings";
import type { PoetryDetail } from "@/lib/poetry/repository";
import {
  buildInitialReviewPlayerQueue,
  mergePersistedReviewPlayerQueue,
} from "@/lib/review/player-queue";
import {
  readReviewQueue,
  writeReviewQueue,
} from "@/lib/review/session-queue";

type ReviewPoetryStageProps = {
  poetry: PoetryDetail;
  initialQueuePoetryIds: string[];
  initialQueuePosition: number | null;
  dueTodayCount: number;
  upcomingCount: number;
  recentWrongCount: number;
  onSubmitReviewSelfReport: (input: {
    poetryId: string;
    isCorrect: boolean;
  }) => Promise<{
    nextState: {
      poetryId: string;
      mastery: number;
      reviewStage: number;
      currentIntervalDays: number;
      nextReviewAt: Date | null;
    } | null;
  }>;
};

function getAudioBadgeLabel(audioStatus: PoetryDetail["audio"]["audioStatus"]) {
  if (audioStatus === "ready") {
    return "复习朗读";
  }

  if (audioStatus === "tts") {
    return "TTS 复习";
  }

  return "无音频";
}

function getAudioBadgeTone(audioStatus: PoetryDetail["audio"]["audioStatus"]) {
  if (audioStatus === "ready") {
    return "ready" as const;
  }

  if (audioStatus === "none") {
    return "placeholder" as const;
  }

  return "neutral" as const;
}

export function ReviewPoetryStage({
  poetry,
  initialQueuePoetryIds,
  initialQueuePosition,
  dueTodayCount,
  upcomingCount,
  recentWrongCount,
  onSubmitReviewSelfReport,
}: ReviewPoetryStageProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAudio = poetry.audio.audioStatus !== "none" && poetry.audio.url !== null;
  const lyrics = poetry.lines.map((line, index) => ({
    text: line,
    pinyin: poetry.pinyin[index],
  }));
  const [queuePoetryIds, setQueuePoetryIds] = useState(() =>
    buildInitialReviewPlayerQueue({
      poetryId: poetry.id,
      initialQueuePoetryIds,
    }),
  );
  const queuePosition = queuePoetryIds.indexOf(poetry.id);
  const nextPoetryId = queuePoetryIds[queuePosition + 1] ?? null;
  const [showPinyin, setShowPinyin] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(poetry.audio.durationMs);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentLineStartMs, setCurrentLineStartMs] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(!hasAudio);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQueuePoetryIds(
      buildInitialReviewPlayerQueue({
        poetryId: poetry.id,
        initialQueuePoetryIds,
      }),
    );
  }, [initialQueuePoetryIds, poetry.id]);

  useEffect(() => {
    const persistedQueue = readReviewQueue();

    if (!persistedQueue) {
      return;
    }

    setQueuePoetryIds((currentQueuePoetryIds) => {
      const nextQueuePoetryIds = mergePersistedReviewPlayerQueue({
        poetryId: poetry.id,
        initialQueuePoetryIds: currentQueuePoetryIds,
        persistedQueuePoetryIds: persistedQueue.poetryIds,
      });

      if (
        nextQueuePoetryIds.length === currentQueuePoetryIds.length &&
        nextQueuePoetryIds.every((poetryId, index) => poetryId === currentQueuePoetryIds[index])
      ) {
        return currentQueuePoetryIds;
      }

      return nextQueuePoetryIds;
    });
  }, [poetry.id]);

  useEffect(() => {
    const currentAudio = audioRef.current;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio.load();
      audioRef.current = null;
    }

    if (!hasAudio || !poetry.audio.url) {
      return;
    }

    const nextAudio = new Audio();
    nextAudio.preload = "metadata";

    const handleTimeUpdate = () => {
      const nextTimeMs = Math.floor(nextAudio.currentTime * 1000);
      const nextDurationMs =
        Number.isFinite(nextAudio.duration) && nextAudio.duration > 0
          ? Math.floor(nextAudio.duration * 1000)
          : poetry.audio.durationMs;
      setCurrentTimeMs(nextTimeMs);

      if (nextDurationMs > 0 && nextTimeMs / nextDurationMs >= 0.8) {
        setIsUnlocked(true);
      }
    };
    const handleLoadedMetadata = () => {
      const nextDurationMs =
        Number.isFinite(nextAudio.duration) && nextAudio.duration > 0
          ? Math.floor(nextAudio.duration * 1000)
          : poetry.audio.durationMs;
      setDurationMs(nextDurationMs);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTimeMs(Math.floor(nextAudio.duration * 1000) || poetry.audio.durationMs);
      setIsUnlocked(true);
    };

    nextAudio.addEventListener("timeupdate", handleTimeUpdate);
    nextAudio.addEventListener("loadedmetadata", handleLoadedMetadata);
    nextAudio.addEventListener("durationchange", handleLoadedMetadata);
    nextAudio.addEventListener("play", handlePlay);
    nextAudio.addEventListener("pause", handlePause);
    nextAudio.addEventListener("ended", handleEnded);

    audioRef.current = nextAudio;

    // Fetch audio as blob to avoid download-manager extensions (e.g. IDM)
    // intercepting the .mp3 request and triggering a file-save dialog.
    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(poetry.audio.url)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        nextAudio.src = objectUrl;
        // Auto-play after blob source is ready
        void nextAudio.play().catch(() => {
          setIsPlaying(false);
        });
      })
      .catch(() => {
        // Failed to load audio — silently recover.
      });

    return () => {
      cancelled = true;
      nextAudio.pause();
      nextAudio.removeEventListener("timeupdate", handleTimeUpdate);
      nextAudio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      nextAudio.removeEventListener("durationchange", handleLoadedMetadata);
      nextAudio.removeEventListener("play", handlePlay);
      nextAudio.removeEventListener("pause", handlePause);
      nextAudio.removeEventListener("ended", handleEnded);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      nextAudio.removeAttribute("src");
      nextAudio.load();
      if (audioRef.current === nextAudio) {
        audioRef.current = null;
      }
    };
  }, [hasAudio, poetry.audio.durationMs, poetry.audio.url]);

  useEffect(() => {
    writeReviewQueue(queuePoetryIds, poetry.id);
  }, [poetry.id, queuePoetryIds]);

  function seekTo(nextTimeMs: number) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = Math.max(nextTimeMs, 0) / 1000;
    setCurrentTimeMs(Math.max(nextTimeMs, 0));
  }

  async function togglePlayPause() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      if (audio.ended) {
        audio.currentTime = 0;
      }

      try {
        await audio.play();
      } catch {
        // AbortError: play() was interrupted by pause() or a new load.
        // NotAllowedError: autoplay policy blocked playback.
        // Both are expected in normal interaction — silently recover.
      }

      return;
    }

    audio.pause();
  }

  function replayCurrentLine() {
    if (!hasAudio) {
      return;
    }

    seekTo(currentLineStartMs);
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play().catch(() => {});
    }
  }

  function replayAll() {
    if (!hasAudio) {
      return;
    }

    seekTo(0);
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play().catch(() => {});
    }
  }

  function handleSubmit(isCorrect: boolean) {
    if (!isUnlocked) {
      return;
    }

    startTransition(async () => {
      await onSubmitReviewSelfReport({
        poetryId: poetry.id,
        isCorrect,
      });

      if (nextPoetryId) {
        writeReviewQueue(queuePoetryIds, nextPoetryId);
        router.push(`/review/${nextPoetryId}` as Route);
        return;
      }

      setMessage(isCorrect ? "已记录：会背了。" : "已记录：还不熟。");
      router.push("/review" as Route);
    });
  }

  return (
    <main className="min-h-screen bg-paper px-6 pb-28 pt-10 text-ink-900 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={"/review" as Route}
            className="inline-flex w-fit items-center rounded-full border border-ink-200 bg-surface/70 px-4 py-2 text-sm text-ink-600 transition hover:bg-surface"
          >
            返回复习池
          </Link>
          <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
            复习播放
          </p>
        </div>

        {/* Dashboard: flat stats with dividers */}
        <section className="flex items-center justify-between border-b border-ink-200/50 px-2 pb-4">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-ink-400">批次</span>
            <span className="font-sans text-xl font-bold text-ink-900">
              {queuePosition >= 0 ? queuePosition + 1 : initialQueuePosition ?? 1} / {queuePoetryIds.length}
            </span>
          </div>
          <div className="h-8 w-px bg-ink-200/50" />
          <div className="flex flex-col">
            <span className="font-sans text-xs text-ink-400">今日待复习</span>
            <span className="font-sans text-xl font-bold text-ink-900">{dueTodayCount}</span>
          </div>
          <div className="h-8 w-px bg-ink-200/50" />
          <div className="flex flex-col">
            <span className="font-sans text-xs text-ink-400">即将到期</span>
            <span className="font-sans text-xl font-bold text-ink-900">{upcomingCount}</span>
          </div>
          <div className="h-8 w-px bg-ink-200/50" />
          <div className="flex flex-col">
            <span className="font-sans text-xs text-ink-400">最近错题</span>
            <span className="font-sans text-xl font-bold text-ink-900">{recentWrongCount}</span>
          </div>
        </section>

        {/* Main content: poster + lyrics */}
        <section className="relative overflow-hidden rounded-[2.25rem] border border-ink-200 bg-surface px-5 py-6 shadow-[var(--shadow-panel)] sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(53,78,107,0.05),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(184,75,75,0.04),transparent_30%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(18rem,28rem)_minmax(0,1fr)] lg:items-start">
            <PoetryPoster
              variant="review"
              imageSrc={poetry.image.thumbPath ?? poetry.image.imagePath}
              imageAlt={`${poetry.title} 配图`}
              isPlaceholder={poetry.image.isPlaceholder}
              priority
              badge={
                <PosterStatusBadge
                  label={getAudioBadgeLabel(poetry.audio.audioStatus)}
                  tone={getAudioBadgeTone(poetry.audio.audioStatus)}
                />
              }
            >
              <PosterTitleBlock
                title={poetry.title}
                author={poetry.author}
                dynasty={poetry.dynasty}
              />
            </PoetryPoster>

            <div className="space-y-5">
              {/* Metadata: tags (ghost style) + pinyin toggle (top-right) */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {poetry.themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-400"
                    >
                      {theme}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPinyin((current) => !current)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${
                    showPinyin
                      ? "bg-primary/10 text-primary"
                      : "text-ink-400 hover:text-ink-600"
                  }`}
                >
                  <span className={`inline-block h-4 w-7 rounded-full transition-colors ${showPinyin ? "bg-primary" : "bg-ink-200"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-surface shadow-sm transition-transform ${showPinyin ? "translate-x-3" : "translate-x-0"}`} />
                  </span>
                  拼音
                </button>
              </div>

              {/* Lyrics: flow layout (no bubbles) */}
              {hasAudio ? (
                <LyricsWindow
                  layout="flow"
                  mode="auto"
                  lines={lyrics}
                  showPinyin={showPinyin}
                  durationMs={durationMs}
                  audioCurrentTimeMs={currentTimeMs}
                  lineTimings={poetry.audio.lineTimings}
                  onActiveLineChange={(lineIndex) => {
                    setCurrentLineIndex(lineIndex);
                    setCurrentLineStartMs(
                      getLineStartMs({
                        durationMs,
                        lineCount: poetry.lines.length,
                        lineIndex,
                        lineTimings: poetry.audio.lineTimings,
                      }),
                    );
                  }}
                />
              ) : (
                <LyricsWindow
                  layout="flow"
                  mode="manual"
                  lines={lyrics}
                  showPinyin={showPinyin}
                  activeLineIndex={currentLineIndex}
                  onActiveLineChange={setCurrentLineIndex}
                />
              )}
            </div>
          </div>
        </section>

        {/* Message toast */}
        {message ? (
          <div className="rounded-[1.25rem] border border-ink-200 bg-surface px-4 py-3 text-sm text-ink-600">
            {message}
          </div>
        ) : null}
      </div>

      {/* Sticky footer: play controls + self-eval */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200/50 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          {/* Left: play controls */}
          <div className="flex items-center gap-3">
            {hasAudio ? (
              <>
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="rounded-full bg-primary p-2.5 text-white transition hover:brightness-105"
                  aria-label={isPlaying ? "暂停" : "播放"}
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M5.636 4.575a.75.75 0 0 1 .764-.04l12.5 7.5a.75.75 0 0 1 0 1.29l-12.5 7.5A.75.75 0 0 1 5 20.25V5.543a.75.75 0 0 1 .636-.968Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={replayCurrentLine}
                  className="rounded-full border border-ink-200 p-2 text-ink-600 transition hover:bg-surface/50"
                  aria-label="单句重播"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={replayAll}
                  className="rounded-full border border-ink-200 p-2 text-ink-600 transition hover:bg-surface/50"
                  aria-label="从头播放"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              </>
            ) : (
              <span className="rounded-full bg-ink-200/50 px-3 py-1.5 text-xs text-ink-400">
                无音频
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                isUnlocked
                  ? "bg-primary/10 text-primary"
                  : "bg-accent/10 text-accent"
              }`}
            >
              {isUnlocked ? "已解锁" : "需听完解锁"}
            </span>
          </div>

          {/* Right: self-eval buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!isUnlocked || isPending}
              className="rounded-full border border-primary px-6 py-2 text-sm text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "记录中..." : "还不熟"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={!isUnlocked || isPending}
              className="rounded-full bg-primary px-6 py-2 text-sm text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "记录中..." : "会背了"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
