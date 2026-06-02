"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Render a line of Chinese text with HTML5 ruby pinyin annotations.
 * Pairs each CJK character with its corresponding pinyin syllable,
 * skipping punctuation and non-CJK characters.
 */
function renderRubyText(text: string, pinyin: string) {
  const chars = [...text];
  const syllables = pinyin.trim().split(/\s+/);
  let syllableIndex = 0;

  return chars.map((char, i) => {
    const isCJK = /[一-鿿㐀-䶿]/.test(char);
    if (!isCJK || syllableIndex >= syllables.length) {
      return <span key={i}>{char}</span>;
    }
    const syllable = syllables[syllableIndex++];
    return (
      <ruby key={i} className="ruby-inline">
        {char}
        <rt className="font-sans text-[10px] leading-none font-normal text-ink-400">
          {syllable}
        </rt>
      </ruby>
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
};

type LyricsWindowBaseProps = {
  lines: LyricsLine[];
  showPinyin: boolean;
  layout?: "bubble" | "flow";
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
  const layout = props.layout ?? "bubble";
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
      data-layout={layout}
      data-mode={props.mode}
      onScroll={props.mode === "auto" ? () => setIsUserScrolling(true) : undefined}
    >
      {layout === "flow" ? (
        <div className="space-y-3">
          {props.lines.map((line, lineIndex) => {
            const isActive = lineIndex === activeLineIndex;
            const shouldShowPinyin = getPinyinVisibility({
              showPinyin: props.showPinyin,
              lineIndex,
              activeLineIndex,
            });

            return (
              <p
                key={`${lineIndex}-${line}`}
                className={`font-serif text-lg tracking-widest leading-[2.8] transition-all duration-300 ease-in-out ${
                  isActive
                    ? "text-ink-900 font-bold"
                    : "text-ink-400 opacity-70"
                }`}
                data-line-index={lineIndex}
              >
                {shouldShowPinyin && line.pinyin
                  ? renderRubyText(line.text, line.pinyin)
                  : line.text}
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
