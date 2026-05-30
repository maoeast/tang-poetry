import assert from "node:assert/strict";
import test from "node:test";

import { getAudioStatus, getAudioUrl } from "@/lib/audio";

test("getAudioUrl uses the default poetry audio base path", () => {
  const previousAudioBaseUrl = process.env.AUDIO_BASE_URL;
  delete process.env.AUDIO_BASE_URL;

  assert.equal(getAudioUrl("ts300-0001"), "/audio/poetry/ts300-0001.mp3");

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

test('getAudioStatus returns "none" when audio metadata is missing', () => {
  assert.equal(getAudioStatus(null), "none");
});

test("getAudioStatus returns the metadata status when available", () => {
  assert.equal(getAudioStatus({ status: "ready" }), "ready");
});
