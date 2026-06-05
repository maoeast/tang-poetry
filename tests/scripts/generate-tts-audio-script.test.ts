import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

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

test("generate-tts-audio script builds stepaudio-2.5-tts requests with top-level instruction", () => {
  const output = execFileSync(
    "python",
    [
      "-X",
      "utf8",
      "-c",
      [
        "import importlib.util, json",
        "spec = importlib.util.spec_from_file_location('gen', 'scripts/generate-tts-audio.py')",
        "mod = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(mod)",
        "poem = {'id': 'c8a4faa6-8666-44f9-b4c9-df78d7af844d', 'title': '送别', 'author': '王维', 'paragraphs': ['山中相送罢，日暮掩柴扉。', '春草明年绿，王孙归不归。']}",
        "print(json.dumps(mod.build_speech_request(poem), ensure_ascii=False))",
      ].join("; "),
    ],
    { encoding: "utf8", cwd: process.cwd() },
  );

  const payload = JSON.parse(output);
  assert.equal(payload.model, "stepaudio-2.5-tts");
  assert.equal(payload.voice, "cixingnansheng");
  assert.equal(payload.response_format, "mp3");
  assert.equal(payload.instruction, "语气恬淡闲远，诗中有画，意境空灵");
  assert.ok(typeof payload.input === "string" && payload.input.length > 0);
  assert.equal(payload.volume, 1.0);
  assert.ok(!("extra_body" in payload));
});

test("generate-tts-audio script scopes generation to explicit --poem-id values", () => {
  assert.match(
    script,
    /if args\.poem_id:\s+target_ids = \{p\.strip\(\) for p in args\.poem_id if p\.strip\(\)\}\s+else:\s+target_ids = set\(NEED_AUDIO_IDS\)/,
  );
});
