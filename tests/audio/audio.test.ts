import assert from "node:assert/strict";
import test from "node:test";

import { getAudioStatus, getAudioUrl, hasMappedAudioFile } from "@/lib/audio";

test("getAudioUrl uses the default poetry audio base path", () => {
  const previousAudioBaseUrl = process.env.AUDIO_BASE_URL;
  delete process.env.AUDIO_BASE_URL;

  assert.equal(getAudioUrl("ts300-0001"), "/audio/poetry/ts300-0001.mp3");

  process.env.AUDIO_BASE_URL = previousAudioBaseUrl;
});

test("getAudioUrl prefers sourceUid when provided for legacy uuid audio files", () => {
  const previousAudioBaseUrl = process.env.AUDIO_BASE_URL;
  delete process.env.AUDIO_BASE_URL;

  assert.equal(
    getAudioUrl("ts300-0001", "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1"),
    "/audio/poetry/c65539db-4e2b-4ce4-a22b-563b6ef3f4f1.mp3",
  );

  process.env.AUDIO_BASE_URL = previousAudioBaseUrl;
});

test("getAudioUrl supports poem-specific audio source overrides", () => {
  const previousAudioBaseUrl = process.env.AUDIO_BASE_URL;
  delete process.env.AUDIO_BASE_URL;

  assert.equal(
    getAudioUrl("ts300-0145", "c8a4faa6-8666-44f9-b4c9-df78d7af844d"),
    "/audio/poetry/c8a4faa6-8666-44f9-b4c9-df78d7af844d.mp3",
  );

  process.env.AUDIO_BASE_URL = previousAudioBaseUrl;
});

test("getAudioUrl uses AUDIO_BASE_URL when configured", () => {
  const previousAudioBaseUrl = process.env.AUDIO_BASE_URL;
  process.env.AUDIO_BASE_URL = "https://cdn.example.com/poetry-audio";

  assert.equal(
    getAudioUrl("ts300-0001"),
    "https://cdn.example.com/poetry-audio/ts300-0001.mp3",
  );

  process.env.AUDIO_BASE_URL = previousAudioBaseUrl;
});

test("getAudioUrl combines AUDIO_BASE_URL with sourceUid when configured", () => {
  const previousAudioBaseUrl = process.env.AUDIO_BASE_URL;
  process.env.AUDIO_BASE_URL = "https://cdn.example.com/poetry-audio";

  assert.equal(
    getAudioUrl("ts300-0001", "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1"),
    "https://cdn.example.com/poetry-audio/c65539db-4e2b-4ce4-a22b-563b6ef3f4f1.mp3",
  );

  process.env.AUDIO_BASE_URL = previousAudioBaseUrl;
});

test('getAudioStatus returns "none" when audio metadata is missing', () => {
  assert.equal(getAudioStatus(null), "none");
});

test("getAudioStatus returns the metadata status when available", () => {
  assert.equal(getAudioStatus({ status: "ready" }), "ready");
});

test("hasMappedAudioFile prefers sourceUid-based UUID files", () => {
  assert.equal(
    hasMappedAudioFile(
      "ts300-0001",
      "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1",
      (path) => path === "public/audio/poetry/c65539db-4e2b-4ce4-a22b-563b6ef3f4f1.mp3",
    ),
    true,
  );
});

test("hasMappedAudioFile supports poem-specific audio source overrides", () => {
  assert.equal(
    hasMappedAudioFile(
      "ts300-0145",
      "c8a4faa6-8666-44f9-b4c9-df78d7af844d",
      (path) => path === "public/audio/poetry/c8a4faa6-8666-44f9-b4c9-df78d7af844d.mp3",
    ),
    true,
  );
});

test("hasMappedAudioFile falls back to poetryId files when sourceUid is missing", () => {
  assert.equal(
    hasMappedAudioFile(
      "ts300-0005",
      null,
      (path) => path === "public/audio/poetry/ts300-0005.mp3",
    ),
    true,
  );
});
