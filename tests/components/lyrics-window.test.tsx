import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { LyricsWindow, type LyricsWindowProps } from "@/components/lyrics/lyrics-window";

const sampleLines = [
  { text: "床前明月光", pinyin: "chuang qian ming yue guang" },
  { text: "疑是地上霜", pinyin: "yi shi di shang shuang" },
  { text: "举头望明月", pinyin: "ju tou wang ming yue" },
];

test("LyricsWindow auto mode highlights the active line from audio time fallback", () => {
  const markup = renderToStaticMarkup(
    <LyricsWindow
      mode="auto"
      lines={sampleLines}
      showPinyin={true}
      durationMs={9_000}
      audioCurrentTimeMs={3_100}
    />,
  );

  assert.match(markup, /data-active-line="1"/);
  assert.match(markup, /yi shi di shang shuang/);
  assert.doesNotMatch(markup, /chuang qian ming yue guang/);
});

test("LyricsWindow manual mode respects external activeLineIndex", () => {
  const markup = renderToStaticMarkup(
    <LyricsWindow
      mode="manual"
      lines={sampleLines}
      showPinyin={true}
      activeLineIndex={2}
    />,
  );

  assert.match(markup, /data-active-line="2"/);
  assert.match(markup, /ju tou wang ming yue/);
});

void (
  <LyricsWindow
    mode="auto"
    lines={sampleLines}
    durationMs={9_000}
    audioCurrentTimeMs={0}
    showPinyin={false}
  />
);

// @ts-expect-error auto mode does not accept an external activeLineIndex controller
const invalidAutoProps: LyricsWindowProps = {
  mode: "auto",
  lines: sampleLines,
  durationMs: 9_000,
  audioCurrentTimeMs: 0,
  activeLineIndex: 1,
  showPinyin: false,
};

void <LyricsWindow {...invalidAutoProps} />;

// @ts-expect-error auto mode requires audioCurrentTimeMs
void <LyricsWindow mode="auto" lines={sampleLines} durationMs={9_000} showPinyin={false} />;
