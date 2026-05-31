import assert from "node:assert/strict";
import test from "node:test";

import {
  toGeneratedImagePath,
  toGeneratedThumbPath,
} from "@/scripts/finalize-image-assets";

test("finalized image paths use the generated image directory", () => {
  assert.equal(toGeneratedImagePath("ts300-0001"), "/images/generated/ts300-0001.png");
  assert.equal(
    toGeneratedThumbPath("ts300-0001"),
    "/images/generated/ts300-0001-thumb.png",
  );
});
