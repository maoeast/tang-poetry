import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";

const script = readFileSync("scripts/retry-image-downloads.ts", "utf8");

test("retry-image-downloads writes retried files back into AIimages", () => {
  assert.match(script, /const AIIMAGES_DIR = path\.join\(process\.cwd\(\), "AIimages"\)/);
  assert.match(script, /return path\.join\(AIIMAGES_DIR, `\$\{name\}\.png`\)/);
});

test("retry-image-downloads retries items that failed at download time using saved urls", () => {
  assert.match(script, /result\.error\?\.includes\("下载图片失败"\)/);
  assert.match(script, /completedByName/);
  assert.match(script, /const url = completed\?\.urls\?\.\[0\]/);
});
