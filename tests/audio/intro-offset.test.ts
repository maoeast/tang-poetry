import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { estimateIntroOffsetMs } from "@/lib/audio/intro-offset";

describe("estimateIntroOffsetMs", () => {
  it("returns offset proportional to title + author length", () => {
    // "静夜思，唐代，李白。" = 3 + 3 + 2 + 1 = 9 chars → 9 × 300 = 2700
    const offset = estimateIntroOffsetMs("静夜思", "李白");
    assert.equal(offset, 2700);
  });

  it("returns larger offset for long-title poems", () => {
    // "茅屋为秋风所破歌，唐代，杜甫。" = 8 + 3 + 2 + 1 = 14 chars → 4200
    const short = estimateIntroOffsetMs("静夜思", "李白");
    const long = estimateIntroOffsetMs("茅屋为秋风所破歌", "杜甫");
    assert.ok(long > short, "long title should have larger offset");
    assert.equal(long, 4200);
  });

  it("returns same offset for same total character count", () => {
    const a = estimateIntroOffsetMs("将进酒", "李白"); // 3+3+2+1 = 9
    const b = estimateIntroOffsetMs("静夜思", "杜甫"); // 3+3+2+1 = 9
    assert.equal(a, b);
  });
});
