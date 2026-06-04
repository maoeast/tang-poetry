import type { WeeklyCheckIn } from "@/lib/stats/weekly-checkin";

type WeeklyStreakMatrixProps = {
  data: WeeklyCheckIn;
};

export function WeeklyStreakMatrix({ data }: WeeklyStreakMatrixProps) {
  const todayKey = data.days.find(
    (d) => !d.isFuture && d.dateKey <= Date.now(),
  )?.dateKey;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs tracking-[0.18em] text-ink-400">本周打卡</span>
      <div className="flex items-center gap-2">
        {data.days.map((day) => {
          const isToday = day.dateKey === todayKey && !day.isFuture;

          return (
            <span
              key={day.label}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-all ${
                isToday
                  ? // 今天 — 实心主色 + 高亮边框
                    "bg-primary text-white ring-2 ring-primary/50 ring-offset-2 ring-offset-surface"
                  : day.isFuture
                    ? // 未来 — 淡空心圆
                      "border border-ink-100 text-ink-300"
                    : day.isChecked
                      ? // 已打卡（非今天）— 淡色实心圆
                        "bg-primary/40 text-white"
                      : // 过去未打卡 — 空心灰圆
                        "border border-ink-200 text-ink-400"
              }`}
              title={`周${day.label}${day.isChecked ? " ✓" : ""}`}
            >
              {day.isChecked ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span>{day.label}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
