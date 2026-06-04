type GetLineStartMsArgs = {
  durationMs: number;
  lineCount: number;
  lineIndex: number;
  lineTimings?: Array<{
    lineIndex: number;
    startMs: number;
  }> | null;
  /** Estimated intro narration offset (title + author). Used only in even-distribution fallback. */
  introOffsetMs?: number;
};

function getAverageLineStartMs(
  durationMs: number,
  lineCount: number,
  lineIndex: number,
  introOffsetMs: number,
) {
  if (lineCount <= 0) {
    return 0;
  }

  const bodyDuration = durationMs - introOffsetMs;
  return Math.floor(introOffsetMs + (bodyDuration / lineCount) * lineIndex);
}

export function getLineStartMs({
  durationMs,
  lineCount,
  lineIndex,
  lineTimings,
  introOffsetMs = 0,
}: GetLineStartMsArgs) {
  const timing = lineTimings?.find((item) => item.lineIndex === lineIndex);

  return typeof timing?.startMs === "number"
    ? timing.startMs
    : getAverageLineStartMs(durationMs, lineCount, lineIndex, introOffsetMs);
}
