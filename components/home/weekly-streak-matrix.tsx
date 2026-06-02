import type { WeeklyCheckIn } from "@/lib/stats/weekly-checkin";

type WeeklyStreakMatrixProps = {
  data: WeeklyCheckIn;
};

export function WeeklyStreakMatrix({ data }: WeeklyStreakMatrixProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs tracking-[0.18em] text-ink-400">本周打卡</span>
      <div className="flex items-center gap-1.5">
        {data.days.map((day) => {
          const isToday = !day.isFuture && day.isChecked;

          return (
            <span
              key={day.label}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all ${
                isToday
                  ? "bg-primary text-white"
                  : day.isFuture
                    ? "bg-ink-100 text-ink-400"
                    : day.isChecked
                      ? "bg-primary text-white"
                      : "bg-ink-100 text-ink-400"
              }`}
              title={`周${day.label}${day.isChecked ? " ✓" : ""}`}
            >
              {day.isChecked ? (
                <svg
                  width="10"
                  height="10"
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
