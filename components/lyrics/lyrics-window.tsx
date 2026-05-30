"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LineTiming = {
  lineIndex: number;
  startMs: number;
};

type LyricsLine = {
  text: string;
  pinyin?: string;
};

type LyricsWindowBaseProps = {
  lines: LyricsLine[];
  showPinyin: boolean;
  className?: string;
};

type LyricsWindowAutoProps = LyricsWindowBaseProps & {
  mode: "auto";
  durationMs: number;
  audioCurrentTimeMs: number;
  lineTimings?: LineTiming[];
  activeLineIndex?: never;
  onActiveLineChange?: (lineIndex: number) => void;
};

type LyricsWindowManualProps = LyricsWindowBaseProps & {
  mode: "manual";
  activeLineIndex?: number;
  onActiveLineChange?: (lineIndex: number) => void;
};

type LyricsWindowStaticProps = LyricsWindowBaseProps & {
  mode: "static";
  activeLineIndex?: number;
  onActiveLineChange?: (lineIndex: number) => void;
};

export type LyricsWindowProps =
  | LyricsWindowAutoProps
  | LyricsWindowManualProps
  | LyricsWindowStaticProps;

function getActiveLineIndex({
  lines,
  durationMs,
  audioCurrentTimeMs,
  lineTimings,
}: {
  lines: LyricsLine[];
  durationMs: number;
  audioCurrentTimeMs: number;
  lineTimings?: LineTiming[];
}) {
  if (lines.length === 0) {
    return -1;
  }

  if (lineTimings && lineTimings.length > 0) {
    const sorted = [...lineTimings].sort((left, right) => left.startMs - right.startMs);

    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      if (audioCurrentTimeMs >= sorted[index].startMs) {
        return Math.min(Math.max(sorted[index].lineIndex, 0), lines.length - 1);
      }
    }

    return 0;
  }

  if (durationMs <= 0) {
    return 0;
  }

  const segmentLength = durationMs / lines.length;
  const resolvedIndex = Math.floor(audioCurrentTimeMs / segmentLength);

  return Math.min(Math.max(resolvedIndex, 0), lines.length - 1);
}

function getPinyinVisibility({
  showPinyin,
  lineIndex,
  activeLineIndex,
}: {
  showPinyin: boolean;
  lineIndex: number;
  activeLineIndex: number;
}) {
  if (!showPinyin || activeLineIndex < 0) {
    return false;
  }

  return lineIndex === activeLineIndex;
}

export function LyricsWindow(props: LyricsWindowProps) {
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const activeLineIndex = useMemo(() => {
    if (props.mode === "auto") {
      return getActiveLineIndex({
        lines: props.lines,
        durationMs: props.durationMs,
        audioCurrentTimeMs: props.audioCurrentTimeMs,
        lineTimings: props.lineTimings,
      });
    }

    return props.activeLineIndex ?? -1;
  }, [props]);

  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(props.mode !== "auto");
  const previousActiveLineIndexRef = useRef(activeLineIndex);

  useEffect(() => {
    props.onActiveLineChange?.(activeLineIndex);
  }, [activeLineIndex, props]);

  useEffect(() => {
    if (props.mode !== "auto") {
      return;
    }

    if (isUserScrolling) {
      if (activeLineIndex !== previousActiveLineIndexRef.current) {
        setIsUserScrolling(false);
        setIsAutoFollowEnabled(true);
        previousActiveLineIndexRef.current = activeLineIndex;
        return;
      }

      setIsAutoFollowEnabled(false);
      previousActiveLineIndexRef.current = activeLineIndex;
      return;
    }

    if (activeLineIndex !== previousActiveLineIndexRef.current) {
      setIsAutoFollowEnabled(true);
    }

    previousActiveLineIndexRef.current = activeLineIndex;
  }, [activeLineIndex, isUserScrolling, props]);

  return (
    <section
      className={props.className ?? ""}
      data-active-line={activeLineIndex >= 0 ? String(activeLineIndex) : undefined}
      data-auto-follow={props.mode === "auto" ? String(isAutoFollowEnabled) : undefined}
      data-mode={props.mode}
      onScroll={props.mode === "auto" ? () => setIsUserScrolling(true) : undefined}
    >
      <div className="space-y-4 rounded-[1.75rem] border border-[var(--color-line)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
        {props.lines.map((line, lineIndex) => {
          const isActive = lineIndex === activeLineIndex;
          const shouldShowPinyin = getPinyinVisibility({
            showPinyin: props.showPinyin,
            lineIndex,
            activeLineIndex,
          });

          return (
            <article
              key={`${lineIndex}-${line}`}
              className={`rounded-[1.25rem] px-4 py-3 transition ${
                isActive
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                  : "bg-transparent text-[var(--color-muted)]"
              }`}
              data-line-index={lineIndex}
            >
              <p className="text-lg leading-8">{line.text}</p>
              {shouldShowPinyin && line.pinyin ? (
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  {line.pinyin}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
