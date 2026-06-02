"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";

import { LyricsWindow } from "@/components/lyrics/lyrics-window";
import { PoetryPoster } from "@/components/poster/poetry-poster";
import { PosterStatusBadge } from "@/components/poster/poster-status-badge";
import { PosterTitleBlock } from "@/components/poster/poster-title-block";
import { getLineStartMs } from "@/lib/audio/timings";
import type { PoetryDetail } from "@/lib/poetry/repository";

type ImmersivePoetryStageProps = {
  poetry: PoetryDetail;
};

type PlaybackRate = 0.75 | 1 | 1.25 | 1.5;

function getAudioBadgeLabel(audioStatus: PoetryDetail["audio"]["audioStatus"]) {
  if (audioStatus === "ready") {
    return "朗读就绪";
  }

  if (audioStatus === "tts") {
    return "TTS 朗读";
  }

  return "手动阅览";
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

export function ImmersivePoetryStage({ poetry }: ImmersivePoetryStageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAudio = poetry.audio.audioStatus !== "none" && poetry.audio.url !== null;
  const lyrics = poetry.lines.map((line, index) => ({
    text: line,
    pinyin: poetry.pinyin[index],
  }));
  const [showPinyin, setShowPinyin] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(poetry.audio.durationMs);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentLineStartMs, setCurrentLineStartMs] = useState(0);

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
      setCurrentTimeMs(Math.floor(nextAudio.currentTime * 1000));
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
      })
      .catch(() => {
        // Failed to load audio — silently recover; play button will be no-op.
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
    if (!audioRef.current) {
      return;
    }

    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

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
        // AbortError / NotAllowedError — silently recover.
      }

      return;
    }

    audio.pause();
  }

  function seekTo(nextTimeMs: number) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = Math.max(nextTimeMs, 0) / 1000;
    setCurrentTimeMs(Math.max(nextTimeMs, 0));
  }

  function replayCurrentLine() {
    if (hasAudio) {
      seekTo(currentLineStartMs);
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      if (audio.paused) {
        void audio.play().catch(() => {});
      }

      return;
    }

    setCurrentLineIndex((current) => Math.max(current, 0));
  }

  function jumpManualLine(step: -1 | 1) {
    setCurrentLineIndex((current) => {
      const nextIndex = Math.min(Math.max(current + step, 0), poetry.lines.length - 1);
      setCurrentLineStartMs(0);
      return nextIndex;
    });
  }

  const progress = durationMs > 0 ? Math.min(currentTimeMs / durationMs, 1) : 0;

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-ink-200 bg-surface px-5 py-6 shadow-[var(--shadow-panel)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(53,78,107,0.05),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(184,75,75,0.04),transparent_30%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(18rem,28rem)_minmax(0,1fr)] lg:items-start">
        <PoetryPoster
          variant="immersive"
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
          {/* Poetry title — prominent serif */}
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-wide leading-tight">
              {poetry.title}
            </h1>
            <Link
              href={`/author/${poetry.author}` as Route}
              className="mt-2.5 inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/5"
            >
              {poetry.authorAvatarUrl ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-ink-200/60">
                  <Image
                    src={poetry.authorAvatarUrl}
                    alt={poetry.author}
                    fill
                    className="object-cover"
                    sizes="28px"
                  />
                </span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-primary/10 text-xs font-serif text-ink-600">
                  {poetry.author.charAt(0)}
                </span>
              )}
              <span className="font-serif text-sm text-ink-600">
                {poetry.dynasty} · {poetry.author}
              </span>
            </Link>
          </div>

          {/* Tags (ghost) + Pinyin toggle (top-right) */}
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

          {/* Lyrics: flow layout with ruby pinyin */}
          <div className="max-h-[38rem] overflow-y-auto">
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
                onActiveLineChange={(lineIndex) => {
                  setCurrentLineIndex(lineIndex);
                  setCurrentLineStartMs(0);
                }}
              />
            )}
          </div>

          {/* Lightweight audio controls */}
          {hasAudio ? (
            <div className="space-y-3 rounded-[1.25rem] border border-ink-200 bg-surface/60 px-4 py-3">
              {/* Progress bar */}
              <div className="group relative h-1 w-full cursor-pointer rounded-full bg-ink-200/50" onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                seekTo(Math.floor(ratio * durationMs));
              }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary/40 transition-all group-hover:bg-primary/60"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void togglePlayPause()}
                    className="rounded-full bg-primary p-2 text-white transition hover:brightness-105"
                    aria-label={isPlaying ? "暂停" : "播放"}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M5.636 4.575a.75.75 0 0 1 .764-.04l12.5 7.5a.75.75 0 0 1 0 1.29l-12.5 7.5A.75.75 0 0 1 5 20.25V5.543a.75.75 0 0 1 .636-.968Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={replayCurrentLine}
                    className="rounded-full border border-ink-200 p-1.5 text-ink-600 transition hover:bg-surface/50"
                    aria-label="单句重播"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                    </svg>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs text-ink-400">
                  <span>倍速</span>
                  <select
                    aria-label="播放倍速"
                    value={String(playbackRate)}
                    onChange={(event) => setPlaybackRate(Number(event.currentTarget.value) as PlaybackRate)}
                    className="rounded-full border border-ink-200 bg-surface px-2 py-1 text-xs text-ink-600"
                  >
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-dashed border-ink-200 bg-surface/60 px-4 py-3 text-sm text-ink-600">
              <p>暂无音频，可以逐句阅读。</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => jumpManualLine(-1)}
                  className="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 transition hover:bg-surface/50"
                >
                  上一句
                </button>
                <button
                  type="button"
                  onClick={() => jumpManualLine(1)}
                  className="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 transition hover:bg-surface/50"
                >
                  下一句
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
