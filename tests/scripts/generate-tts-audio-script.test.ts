import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const script = readFileSync("scripts/generate-tts-audio.py", "utf8");

test("generate-tts-audio script does not embed a fallback API key", () => {
  assert.match(script, /STEPFUN_API_KEY/);
  assert.doesNotMatch(script, /5TgwA0JGZy5Om9hcxRWJ11laNo5T4YnOBc9XqeMnO7cGTyv9gTJJUXyTLTCqgmWPL/);
  assert.match(script, /raise RuntimeError\("Missing STEPFUN_API_KEY/);
});

test("generate-tts-audio script defaults to the runtime poetry audio directory", () => {
  assert.match(script, /DEFAULT_OUTPUT_DIR = PROJECT_ROOT \/ "public" \/ "audio" \/ "poetry"/);
});

test("generate-tts-audio script supports overriding the output directory from the CLI", () => {
  assert.match(script, /parser\.add_argument\(\s*"--output-dir"/);
  assert.match(script, /args\.output_dir/);
});
