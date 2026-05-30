import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AudioControlBar } from "@/components/audio/audio-control-bar";

const noop = () => {};

test("AudioControlBar returns null when audio is not ready", () => {
  const markup = renderToStaticMarkup(
    <AudioControlBar
      variant="review"
      isReady={false}
      durationMs={9_000}
      currentTimeMs={0}
      playbackRate={1}
      isPlaying={false}
      onPlayPause={noop}
      onReplayLine={noop}
      onReplayAll={noop}
    />,
  );

  assert.equal(markup, "");
});

test("AudioControlBar review variant renders replay all action", () => {
  const markup = renderToStaticMarkup(
    <AudioControlBar
      variant="review"
      isReady
      durationMs={9_000}
      currentTimeMs={1_000}
      playbackRate={1}
      isPlaying={false}
      onPlayPause={noop}
      onReplayLine={noop}
      onReplayAll={noop}
    />,
  );

  assert.match(markup, /再听一遍/);
  assert.doesNotMatch(markup, /type="range"/);
});

test("AudioControlBar immersive variant renders seek bar and playback-rate control", () => {
  const markup = renderToStaticMarkup(
    <AudioControlBar
      variant="immersive"
      isReady
      durationMs={9_000}
      currentTimeMs={2_100}
      playbackRate={1}
      isPlaying={false}
      onPlayPause={noop}
      onReplayLine={noop}
      onSeek={noop}
      onPlaybackRateChange={noop}
    />,
  );

  assert.match(markup, /type="range"/);
  assert.match(markup, /播放倍速/);
});
