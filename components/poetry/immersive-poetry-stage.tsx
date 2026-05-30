"use client";

import { useEffect, useRef, useState } from "react";

import { AudioControlBar } from "@/components/audio/audio-control-bar";
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
    setShowPinyin(false);
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setDurationMs(poetry.audio.durationMs);
    setPlaybackRate(1);
    setCurrentLineIndex(0);
    setCurrentLineStartMs(0);
  }, [poetry.audio.durationMs, poetry.id]);

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
    nextAudio.playbackRate = playbackRate;

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
      setCurrentTimeMs(Math.floor(nextAudio.duration * 1000) || durationMs);
    };

    nextAudio.addEventListener("timeupdate", handleTimeUpdate);
    nextAudio.addEventListener("loadedmetadata", handleLoadedMetadata);
    nextAudio.addEventListener("durationchange", handleLoadedMetadata);
    nextAudio.addEventListener("play", handlePlay);
    nextAudio.addEventListener("pause", handlePause);
    nextAudio.addEventListener("ended", handleEnded);

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
  }, [hasAudio, playbackRate, poetry.audio.durationMs, poetry.audio.url]);

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
      await audio.play();
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
      void togglePlayPause();
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

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-6 shadow-[var(--shadow-soft)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.22),transparent_30%)]" />

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
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(28,22,17,0.88)] via-[rgba(28,22,17,0.32)] to-transparent px-5 pb-5 pt-16 text-sm text-white/82 sm:px-6">
            <p>
              {poetry.image.isPlaceholder
                ? "当前为占位诗境图，后续会继续替换为正式配图。"
                : "插画已从运行时图片资源读取。"}
            </p>
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
              className="max-h-[38rem] overflow-y-auto"
            />
          ) : (
            <LyricsWindow
              mode="manual"
              lines={lyrics}
              showPinyin={showPinyin}
              activeLineIndex={currentLineIndex}
              onActiveLineChange={(lineIndex) => {
                setCurrentLineIndex(lineIndex);
                setCurrentLineStartMs(0);
              }}
              className="max-h-[38rem] overflow-y-auto"
            />
          )}

          {hasAudio ? (
            <AudioControlBar
              variant="immersive"
              isReady
              durationMs={durationMs}
              currentTimeMs={currentTimeMs}
              playbackRate={playbackRate}
              isPlaying={isPlaying}
              onPlayPause={() => {
                void togglePlayPause();
              }}
              onReplayLine={replayCurrentLine}
              onSeek={seekTo}
              onPlaybackRateChange={setPlaybackRate}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-dashed border-[var(--color-line)] bg-white/72 px-4 py-4 text-sm text-[var(--color-muted)]">
              <p>当前没有可播放音频，已切换为手动逐句阅读。</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => jumpManualLine(-1)}
                  className="rounded-full border border-[var(--color-line)] bg-white/80 px-4 py-2"
                >
                  上一句
                </button>
                <button
                  type="button"
                  onClick={() => jumpManualLine(1)}
                  className="rounded-full border border-[var(--color-line)] bg-white/80 px-4 py-2"
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
