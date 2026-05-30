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
