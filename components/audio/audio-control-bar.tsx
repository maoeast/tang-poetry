type AudioControlBarBaseProps = {
  isReady: boolean;
  durationMs: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReplayLine: () => void;
  className?: string;
};

type AudioControlBarImmersiveProps = AudioControlBarBaseProps & {
  variant: "immersive";
  currentTimeMs: number;
  playbackRate: number;
  onSeek: (nextTimeMs: number) => void;
  onPlaybackRateChange: (nextRate: number) => void;
};

type AudioControlBarReviewProps = AudioControlBarBaseProps & {
  variant: "review";
  onReplayAll: () => void;
};

export type AudioControlBarProps =
  | AudioControlBarImmersiveProps
  | AudioControlBarReviewProps;

export function AudioControlBar(props: AudioControlBarProps) {
  if (!props.isReady || props.durationMs <= 0) {
    return null;
  }

  return (
    <div
      className={`rounded-[1.5rem] border border-[var(--color-line)] bg-white/88 p-4 shadow-[0_18px_44px_rgba(96,73,52,0.08)] ${
        props.className ?? ""
      }`}
      data-variant={props.variant}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={props.onPlayPause}
          className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm text-white"
        >
          {props.isPlaying ? "暂停" : "播放"}
        </button>

        <button
          type="button"
          onClick={props.onReplayLine}
          className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm"
        >
          单句重播
        </button>

        {props.variant === "review" ? (
          <button
            type="button"
            onClick={props.onReplayAll}
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm"
          >
            再听一遍
          </button>
        ) : null}
      </div>

      {props.variant === "immersive" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            aria-label="播放进度"
            type="range"
            min={0}
            max={props.durationMs}
            value={Math.min(props.currentTimeMs, props.durationMs)}
            onChange={(event) => props.onSeek(Number(event.currentTarget.value))}
            className="min-w-[12rem] flex-1"
          />

          <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <span>倍速</span>
            <select
              aria-label="播放倍速"
              value={String(props.playbackRate)}
              onChange={(event) => props.onPlaybackRateChange(Number(event.currentTarget.value))}
              className="rounded-full border border-[var(--color-line)] bg-white px-3 py-2"
            >
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
