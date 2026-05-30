type GetLineStartMsArgs = {
  durationMs: number;
  lineCount: number;
  lineIndex: number;
  lineTimings?: Array<{
    lineIndex: number;
    startMs: number;
  }> | null;
};

function getAverageLineStartMs(
  durationMs: number,
  lineCount: number,
  lineIndex: number,
) {
  if (lineCount <= 0) {
    return 0;
  }

  return Math.floor((durationMs / lineCount) * lineIndex);
}

export function getLineStartMs({
  durationMs,
  lineCount,
  lineIndex,
  lineTimings,
}: GetLineStartMsArgs) {
  const timing = lineTimings?.find((item) => item.lineIndex === lineIndex);

  return typeof timing?.startMs === "number"
    ? timing.startMs
    : getAverageLineStartMs(durationMs, lineCount, lineIndex);
}
