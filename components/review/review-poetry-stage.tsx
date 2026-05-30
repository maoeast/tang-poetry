"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { AudioControlBar } from "@/components/audio/audio-control-bar";
import { LyricsWindow } from "@/components/lyrics/lyrics-window";
import { PoetryPoster } from "@/components/poster/poetry-poster";
import { PosterStatusBadge } from "@/components/poster/poster-status-badge";
import { PosterTitleBlock } from "@/components/poster/poster-title-block";
import { getLineStartMs } from "@/lib/audio/timings";
import type { PoetryDetail } from "@/lib/poetry/repository";
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
  const sessionQueue = useMemo(() => readReviewQueue(), []);
  const queuePoetryIds = useMemo(() => {
    const merged = Array.from(
      new Set([
        ...(sessionQueue?.poetryIds ?? []),
        ...initialQueuePoetryIds,
      ]),
    );

    if (!merged.includes(poetry.id)) {
      merged.unshift(poetry.id);
    }

    return merged;
  }, [initialQueuePoetryIds, poetry.id, sessionQueue?.poetryIds]);
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

    const nextAudio = new Audio(poetry.audio.url);
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
    void nextAudio.play().catch(() => {
      setIsPlaying(false);
    });

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
      await audio.play();
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
      void audio.play();
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
      void audio.play();
    }
  }

  function handleReplayHint() {
    replayAll();
    setMessage("已从头重新播放，不会写入复习记录。");
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
    <main className="min-h-screen bg-[var(--color-page)] px-6 py-10 text-[var(--color-ink)] sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={"/review" as Route}
            className="inline-flex w-fit items-center rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:bg-white"
          >
            返回复习池
          </Link>
          <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
            Review Player
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
            <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">批次</p>
            <p className="mt-3 text-3xl font-semibold">
              {queuePosition >= 0 ? queuePosition + 1 : initialQueuePosition ?? 1} / {queuePoetryIds.length}
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
            <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">今日待复习</p>
            <p className="mt-3 text-3xl font-semibold">{dueTodayCount}</p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
            <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">即将到期</p>
            <p className="mt-3 text-3xl font-semibold">{upcomingCount}</p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_12px_30px_rgba(91,74,59,0.08)]">
            <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">最近错题</p>
            <p className="mt-3 text-3xl font-semibold">{recentWrongCount}</p>
          </article>
        </section>

        <section className="relative overflow-hidden rounded-[2.25rem] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-6 shadow-[var(--shadow-soft)] sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.22),transparent_30%)]" />

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
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(28,22,17,0.88)] via-[rgba(28,22,17,0.32)] to-transparent px-5 pb-5 pt-16 text-sm text-white/82 sm:px-6">
                <p>{isUnlocked ? "已解锁复习自评操作。" : "先听到 80% 后再进行复习自评。"}</p>
              </div>
            </PoetryPoster>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[var(--color-line)] bg-white/72 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {poetry.themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full border border-[var(--color-line)] bg-white/80 px-3 py-1 text-sm text-[var(--color-muted)]"
                    >
                      {theme}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPinyin((current) => !current)}
                  className="rounded-full border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm text-[var(--color-ink)]"
                >
                  {showPinyin ? "隐藏拼音" : "显示拼音"}
                </button>
              </div>

              {hasAudio ? (
                <LyricsWindow
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
                  mode="manual"
                  lines={lyrics}
                  showPinyin={showPinyin}
                  activeLineIndex={currentLineIndex}
                  onActiveLineChange={setCurrentLineIndex}
                />
              )}

              <AudioControlBar
                variant="review"
                isReady={hasAudio}
                durationMs={durationMs}
                currentTimeMs={currentTimeMs}
                playbackRate={1}
                isPlaying={isPlaying}
                onPlayPause={togglePlayPause}
                onReplayLine={replayCurrentLine}
                onReplayAll={replayAll}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{poetry.title}</h1>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                有音频时先听到 80% 才能自评；无音频时直接解锁。拼音默认隐藏。
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm ${
                isUnlocked
                  ? "bg-[rgba(92,146,109,0.12)] text-[#2f6a45]"
                  : "bg-[rgba(188,91,66,0.12)] text-[#8c3e2f]"
              }`}
            >
              {isUnlocked ? "已解锁" : "未解锁"}
            </span>
          </div>

          {message ? (
            <p className="mt-4 rounded-[1.25rem] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-muted)]">
              {message}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={!isUnlocked || isPending}
              className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "记录中..." : "会背了"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!isUnlocked || isPending}
              className="rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-medium transition hover:bg-[var(--color-card)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              还不熟
            </button>
            <button
              type="button"
              onClick={handleReplayHint}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-6 py-3 text-sm font-medium transition hover:bg-white"
            >
              再听一遍
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
