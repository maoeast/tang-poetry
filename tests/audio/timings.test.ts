import assert from "node:assert/strict";
import test from "node:test";

import { getLineStartMs } from "@/lib/audio/timings";

test("getLineStartMs falls back to evenly distributed timings when lineTimings are missing", () => {
  assert.equal(
    getLineStartMs({
      durationMs: 12_000,
      lineCount: 4,
      lineIndex: 2,
      lineTimings: null,
    }),
    6_000,
  );
});

test("getLineStartMs uses object timings matched by lineIndex", () => {
  assert.equal(
    getLineStartMs({
      durationMs: 12_000,
      lineCount: 4,
      lineIndex: 2,
      lineTimings: [
        { lineIndex: 3, startMs: 9_500 },
        { lineIndex: 2, startMs: 6_800 },
        { lineIndex: 0, startMs: 0 },
      ],
    }),
    6_800,
  );
});

test("getLineStartMs fallback does not clamp out-of-range lineIndex values", () => {
  assert.equal(
    getLineStartMs({
      durationMs: 12_000,
      lineCount: 4,
      lineIndex: 5,
      lineTimings: null,
    }),
    15_000,
  );
});

test("getLineStartMs shifts even distribution by introOffsetMs", () => {
  // 12s total, 4 lines, 2s intro → body = 10s, each segment = 2500ms
  // Line 0 starts at introOffset (2000), line 1 at 2000+2500=4500, etc.
  assert.equal(
    getLineStartMs({
      durationMs: 12_000,
      lineCount: 4,
      lineIndex: 0,
      lineTimings: null,
      introOffsetMs: 2_000,
    }),
    2_000,
  );
  assert.equal(
    getLineStartMs({
      durationMs: 12_000,
      lineCount: 4,
      lineIndex: 1,
      lineTimings: null,
      introOffsetMs: 2_000,
    }),
    4_500,
  );
  assert.equal(
    getLineStartMs({
      durationMs: 12_000,
      lineCount: 4,
      lineIndex: 2,
      lineTimings: null,
      introOffsetMs: 2_000,
    }),
    7_000,
  );
});

test("getLineStartMs ignores introOffsetMs when lineTimings exist", () => {
  // Explicit timing should not be shifted by introOffsetMs
  assert.equal(
    getLineStartMs({
      durationMs: 12_000,
      lineCount: 4,
      lineIndex: 2,
      lineTimings: [{ lineIndex: 2, startMs: 6_800 }],
      introOffsetMs: 2_000,
    }),
    6_800,
  );
});
