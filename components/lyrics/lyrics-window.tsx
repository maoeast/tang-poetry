"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CJK_REGEX = /[一-鿿㐀-䶿]/;

/**
 * Render a line of Chinese text with proportional character spacing.
 * CJK characters occupy a compact slot; punctuation flows naturally.
 * Pinyin annotation is absolutely positioned so it never pushes characters apart.
 */
function renderGridText(text: string, pinyin: string | undefined, showPinyin: boolean) {
  const chars = [...text];
  const syllables = pinyin?.trim().split(/\s+/) ?? [];
  let syllableIndex = 0;

  return chars.map((char, i) => {
    const isCJK = CJK_REGEX.test(char);
    if (!isCJK) {
      return <span key={i} className="poetry-punct">{char}</span>;
    }

    const syllable = syllableIndex < syllables.length ? syllables[syllableIndex] : undefined;
    syllableIndex++;

    if (showPinyin && syllable) {
      return (
        <ruby key={i} className="cjk-grid-char">
          {char}
          <rt className="font-sans text-xs leading-none font-normal text-ink-400">
            {syllable}
          </rt>
        </ruby>
      );
    }

    return (
      <span key={i} className="cjk-grid-char">{char}</span>
    );
  });
}

type LineTiming = {
  lineIndex: number;
  startMs: number;
};

type LyricsLine = {
  text: string;
  pinyin?: string;
  /** Maps this split line back to its original couplet index (for audio timing) */
  originalIndex?: number;
};

type LyricsWindowBaseProps = {
  lines: LyricsLine[];
  showPinyin: boolean;
  layout?: "bubble" | "flow";
  className?: string;
  /** Number of original (unsplit) lines — used for audio timing when lines have been split */
  originalLineCount?: number;
  /** Estimated intro narration offset (title + author). Applied to even-distribution fallback only. */
  introOffsetMs?: number;
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
  originalLineCount,
  introOffsetMs = 0,
}: {
  lines: LyricsLine[];
  durationMs: number;
  audioCurrentTimeMs: number;
  lineTimings?: LineTiming[];
  originalLineCount?: number;
  introOffsetMs?: number;
}) {
  if (lines.length === 0) {
    return -1;
  }

  const effectiveCount = originalLineCount ?? lines.length;

  if (lineTimings && lineTimings.length > 0) {
    const sorted = [...lineTimings].sort((left, right) => left.startMs - right.startMs);

    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      if (audioCurrentTimeMs >= sorted[index].startMs) {
        return Math.min(Math.max(sorted[index].lineIndex, 0), effectiveCount - 1);
      }
    }

    return 0;
  }

  if (durationMs <= 0) {
    return 0;
  }

  // Subtract intro offset for even-distribution fallback
  const bodyDuration = durationMs - introOffsetMs;
  const bodyTime = audioCurrentTimeMs - introOffsetMs;
  if (bodyTime < 0 || bodyDuration <= 0) {
    return 0;
  }

  const segmentLength = bodyDuration / effectiveCount;
  const resolvedIndex = Math.floor(bodyTime / segmentLength);

  return Math.min(Math.max(resolvedIndex, 0), effectiveCount - 1);
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
  const layout = props.layout ?? "bubble";
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const activeLineIndex = useMemo(() => {
    if (props.mode === "auto") {
      return getActiveLineIndex({
        lines: props.lines,
        durationMs: props.durationMs,
        audioCurrentTimeMs: props.audioCurrentTimeMs,
        lineTimings: props.lineTimings,
        originalLineCount: props.originalLineCount,
        introOffsetMs: props.introOffsetMs,
      });
    }

    return props.activeLineIndex ?? -1;
  }, [props]);

  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(props.mode !== "auto");
  const previousActiveLineIndexRef = useRef(activeLineIndex);
  const lineRefs = useRef<Map<number, HTMLElement>>(new Map());
  const isProgrammaticScrollRef = useRef(false);

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

  // Auto-scroll active line into view (music-player karaoke effect)
  useEffect(() => {
    if (activeLineIndex < 0) return;
    if (props.mode === "auto" && !isAutoFollowEnabled) return;
    if (props.mode === "static") return;

    const lineEl = lineRefs.current.get(activeLineIndex);
    if (!lineEl) return;

    isProgrammaticScrollRef.current = true;
    lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => { isProgrammaticScrollRef.current = false; }, 500);
  }, [activeLineIndex, isAutoFollowEnabled, props.mode]);

  return (
    <section
      className={props.className ?? ""}
      data-active-line={activeLineIndex >= 0 ? String(activeLineIndex) : undefined}
      data-auto-follow={props.mode === "auto" ? String(isAutoFollowEnabled) : undefined}
      data-layout={layout}
      data-mode={props.mode}
      onScroll={props.mode === "auto" ? () => {
        if (!isProgrammaticScrollRef.current) {
          setIsUserScrolling(true);
        }
      } : undefined}
    >
      {layout === "flow" ? (
        <div className="space-y-2 text-center">
          {props.lines.map((line, lineIndex) => {
            const resolvedIndex = line.originalIndex ?? lineIndex;
            const isActive = resolvedIndex === activeLineIndex;
            const shouldShowPinyin = getPinyinVisibility({
              showPinyin: props.showPinyin,
              lineIndex: resolvedIndex,
              activeLineIndex,
            });

            return (
              <p
                key={`${lineIndex}-${line.text}`}
                ref={(el) => { if (el) lineRefs.current.set(resolvedIndex, el); }}
                className={`font-serif text-xl leading-[2.6] transition-all duration-300 ease-in-out ${
                  isActive
                    ? "text-ink-900 font-bold"
                    : "text-ink-600"
                }`}
                data-line-index={lineIndex}
              >
                {renderGridText(line.text, line.pinyin, shouldShowPinyin)}
              </p>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4 rounded-[1.75rem] border border-ink-200 bg-surface/78 p-6 shadow-[var(--shadow-panel)]">
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
                ref={(el) => { if (el) lineRefs.current.set(lineIndex, el); }}
                className={`rounded-[1.25rem] px-4 py-3 transition ${
                  isActive
                    ? "bg-primary/10 text-ink-900"
                    : "bg-transparent text-ink-600"
                }`}
                data-line-index={lineIndex}
              >
                <p className="text-lg leading-8">{line.text}</p>
                {shouldShowPinyin && line.pinyin ? (
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {line.pinyin}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
