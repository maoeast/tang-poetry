"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";

import { LyricsWindow } from "@/components/lyrics/lyrics-window";
import { ImageCarousel } from "@/components/poetry/image-carousel";
import { PoetryPoster } from "@/components/poster/poetry-poster";
import { PosterTitleBlock } from "@/components/poster/poster-title-block";
import { ScriptVariantToggle } from "@/components/poetry/script-variant-toggle";
import { getLineStartMs } from "@/lib/audio/timings";
import { estimateIntroOffsetMs } from "@/lib/audio/intro-offset";
import type { PoetryDetail } from "@/lib/poetry/repository";
import type { ScriptVariant } from "@/lib/poetry/script-variant";

type ImmersivePoetryStageProps = {
  poetry: PoetryDetail;
  initialScriptVariant: ScriptVariant;
};

type PlaybackRate = 0.75 | 1 | 1.25 | 1.5;

const CJK_SPLIT_REGEX = /[一-鿿㐀-䶿]/;

/**
 * Split couplet lines into individual hemistiches for classic four-line display.
 * Each comma-separated segment becomes its own line, with pinyin syllables
 * distributed proportionally based on CJK character count per segment.
 * Lines that don't contain a comma-like separator are kept as-is.
 */
function splitCoupletLines(
  lines: string[],
  pinyin: string[],
): { text: string; pinyin?: string; originalIndex: number }[] {
  const result: { text: string; pinyin?: string; originalIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const syllables = pinyin[i]?.trim().split(/\s+/) ?? [];

    // Split at each comma-like punctuation, keeping punctuation with the preceding text
    const parts: string[] = [];
    let start = 0;
    for (let j = 0; j < text.length; j++) {
      if ("，？！；".includes(text[j])) {
        parts.push(text.substring(start, j + 1));
        start = j + 1;
      }
    }
    if (start < text.length) {
      parts.push(text.substring(start));
    }

    if (parts.length <= 1) {
      result.push({ text, pinyin: pinyin[i] || undefined, originalIndex: i });
      continue;
    }

    let syllableOffset = 0;
    for (const segment of parts) {
      if (!segment) continue;
      const segCjkCount = [...segment].filter((c) => CJK_SPLIT_REGEX.test(c)).length;
      const segPinyin =
        syllables.length >= syllableOffset + segCjkCount
          ? syllables.slice(syllableOffset, syllableOffset + segCjkCount).join(" ")
          : undefined;
      result.push({ text: segment, pinyin: segPinyin, originalIndex: i });
      syllableOffset += segCjkCount;
    }
  }

  return result;
}

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ImmersivePoetryStage({ poetry, initialScriptVariant }: ImmersivePoetryStageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const posterRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const hasAudio = poetry.audio.audioStatus !== "none" && poetry.audio.url !== null;
  const introOffsetMs = estimateIntroOffsetMs(poetry.title, poetry.author);
  const lyrics = splitCoupletLines(poetry.lines, poetry.pinyin);
  const [showPinyin, setShowPinyin] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(poetry.audio.durationMs);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
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
        // Failed to load audio — silently recover
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

  // Detect poetry area overflow for conditional fade mask
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => setHasOverflow(el.scrollHeight > el.clientHeight + 2);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lyrics]);

  // Sync right column maxHeight to left image height (image is the height anchor)
  useEffect(() => {
    const poster = posterRef.current;
    const rightCol = rightColRef.current;
    if (!poster || !rightCol) return;

    const sync = () => {
      const posterHeight = poster.getBoundingClientRect().height;
      rightCol.style.maxHeight = `${posterHeight}px`;
    };
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(poster);
    return () => ro.disconnect();
  }, []);

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
        // AbortError / NotAllowedError — silently recover
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
    <section className="relative">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <div ref={posterRef} className="shrink-0 w-full lg:max-w-[28rem]">
          {poetry.images.length > 1 ? (
            <div className="relative w-full max-w-[480px] overflow-hidden rounded-[2rem]">
              <ImageCarousel
                images={poetry.images.map((img) => ({
                  imagePath: img.imagePath,
                  thumbPath: img.thumbPath,
                  isPlaceholder: img.isPlaceholder,
                  alt: `${poetry.title} 配图`,
                }))}
                priority
              />
              <div className="absolute inset-0 z-10 pointer-events-none">
                <PosterTitleBlock
                  title={poetry.title}
                  author={poetry.author}
                  dynasty={poetry.dynasty}
                />
                {poetry.themes.length > 0 && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 via-black/15 to-transparent px-4 pb-4 pt-10">
                    <p className="text-xs leading-relaxed text-white/75">
                      {poetry.themes.slice(0, 4).join(' · ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <PoetryPoster
              variant="immersive"
              imageSrc={poetry.image.thumbPath ?? poetry.image.imagePath}
              imageAlt={`${poetry.title} 配图`}
              isPlaceholder={poetry.image.isPlaceholder}
              priority
            >
              <PosterTitleBlock
                title={poetry.title}
                author={poetry.author}
                dynasty={poetry.dynasty}
              />
              {poetry.themes.length > 0 && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 via-black/15 to-transparent px-4 pb-4 pt-10">
                  <p className="text-xs leading-relaxed text-white/75">
                    {poetry.themes.slice(0, 4).join(' · ')}
                  </p>
                </div>
              )}
            </PoetryPoster>
          )}
        </div>

        <div ref={rightColRef} className="flex min-h-0 w-full flex-col overflow-hidden lg:max-w-xl lg:mx-auto">
          {/* Poetry title — prominent serif, centered */}
          <div className="shrink-0 text-center">
            <h1 className={`font-serif tracking-wide ${
              poetry.title.length > 15
                ? "text-2xl font-semibold leading-relaxed"
                : "text-3xl font-bold leading-tight"
            }`}>
              {poetry.title}
            </h1>
            <Link
              href={`/author/${poetry.author}` as Route}
              className="mt-2.5 inline-flex justify-center items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/5"
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

          {/* Poetry scroll area with fade mask */}
          <div
            ref={scrollRef}
            className={`scrollbar-hide flex-1 min-h-0 overflow-y-auto py-4${hasOverflow ? " poetry-fade-mask" : ""}`}
          >
            {hasAudio ? (
              <LyricsWindow
                layout="flow"
                mode="auto"
                lines={lyrics}
                showPinyin={showPinyin}
                durationMs={durationMs}
                audioCurrentTimeMs={currentTimeMs}
                lineTimings={poetry.audio.lineTimings}
                originalLineCount={poetry.lines.length}
                introOffsetMs={introOffsetMs}
                onActiveLineChange={(lineIndex) => {
                  setCurrentLineIndex(lineIndex);
                  setCurrentLineStartMs(
                    getLineStartMs({
                      durationMs,
                      lineCount: poetry.lines.length,
                      lineIndex,
                      lineTimings: poetry.audio.lineTimings,
                      introOffsetMs,
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
                originalLineCount={poetry.lines.length}
                onActiveLineChange={(lineIndex) => {
                  setCurrentLineIndex(lineIndex);
                  setCurrentLineStartMs(0);
                }}
              />
            )}
          </div>

          {/* ── Compact reading bar — pinned to bottom ── */}
          <div className="mt-auto shrink-0 pt-3">
          {hasAudio ? (
            <div className="flex items-center gap-2.5 rounded-[1.25rem] border border-ink-200 bg-surface/60 px-3 py-2">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={() => void togglePlayPause()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:brightness-105"
                aria-label={isPlaying ? "暂停" : "播放"}
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

              {/* Replay line */}
              <button
                type="button"
                onClick={replayCurrentLine}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:bg-surface/50"
                aria-label="单句重播"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                </svg>
              </button>

              {/* Progress bar with draggable thumb */}
              <div
                className="group relative flex h-5 flex-1 cursor-pointer items-center"
                role="slider"
                aria-label="播放进度"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                  seekTo(Math.floor(ratio * durationMs));
                }}
              >
                {/* Track */}
                <div className="h-1 w-full rounded-full bg-ink-200/60">
                  <div
                    className="h-full rounded-full bg-primary/50 transition-[width] duration-150 group-hover:bg-primary/70"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                {/* Thumb */}
                <div
                  className="absolute h-3 w-3 rounded-full bg-primary shadow-sm transition-[left] duration-150 group-hover:scale-125"
                  style={{ left: `calc(${progress * 100}% - 6px)` }}
                />
              </div>

              {/* Time */}
              <span className="shrink-0 text-[11px] tabular-nums text-ink-400">
                {formatTime(currentTimeMs)}/{formatTime(durationMs)}
              </span>

              {/* Display mode toggles */}
              <div className="flex shrink-0 items-center gap-1.5">
                <ScriptVariantToggle initialVariant={initialScriptVariant} compact />
                <button
                  type="button"
                  onClick={() => setShowPinyin((current) => !current)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                    showPinyin
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-ink-200 text-ink-400 hover:text-ink-600"
                  }`}
                >
                  拼
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-dashed border-ink-200 bg-surface/60 px-4 py-2 text-sm text-ink-600">
              <p>暂无音频，可以逐句阅读。</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => jumpManualLine(-1)}
                  className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600 transition hover:bg-surface/50"
                >
                  上一句
                </button>
                <button
                  type="button"
                  onClick={() => jumpManualLine(1)}
                  className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600 transition hover:bg-surface/50"
                >
                  下一句
                </button>
                <span className="mx-0.5 h-4 w-px bg-ink-200" />
                <ScriptVariantToggle initialVariant={initialScriptVariant} compact />
                <button
                  type="button"
                  onClick={() => setShowPinyin((current) => !current)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                    showPinyin
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-ink-200 text-ink-400 hover:text-ink-600"
                  }`}
                >
                  拼
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
