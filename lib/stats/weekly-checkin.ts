import { db } from "@/lib/db";

export type WeeklyDay = {
  /** Short day label: 一, 二, 三, 四, 五, 六, 日 */
  label: string;
  /** Start of this day as UTC ms */
  dateKey: number;
  /** Whether the user has at least one activity on this day */
  isChecked: boolean;
  /** Whether this day is in the future (today is earlier) */
  isFuture: boolean;
};

export type WeeklyCheckIn = {
  days: WeeklyDay[];
  /** Consecutive-day streak count */
  streakDays: number;
};

type CheckInRepository = {
  learningRecord: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: { createdAt: true };
      orderBy?: { createdAt: "desc" };
    }) => Promise<Array<{ createdAt: Date }>>;
  };
};

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Return the Monday–Sunday of the week containing `now`.
 * Week starts on Monday (Chinese convention).
 */
function getWeekDates(now: Date): Date[] {
  const dayOfWeek = now.getUTCDay(); // 0=Sun … 6=Sat
  // Convert to Mon=0 … Sun=6
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(startOfUtcDay(now));
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

export async function getWeeklyCheckIn(
  userId: string,
  repository?: CheckInRepository,
  now?: Date,
): Promise<WeeklyCheckIn> {
  const repo = repository ?? (db as unknown as CheckInRepository);
  const referenceDate = now ?? new Date();
  const weekDates = getWeekDates(referenceDate);
  const todayKey = startOfUtcDay(referenceDate);

  // Fetch learning records for the current week
  const mondayKey = startOfUtcDay(weekDates[0]);
  const sundayDate = new Date(weekDates[6]);
  sundayDate.setUTCDate(sundayDate.getUTCDate() + 1);
  const nextMondayKey = startOfUtcDay(sundayDate);

  const weekRecords = await repo.learningRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(mondayKey),
        lt: new Date(nextMondayKey),
      } as Record<string, unknown>,
    },
    select: { createdAt: true },
  });

  // Build a set of active day keys for this week
  const activeDayKeys = new Set<number>();
  for (const record of weekRecords) {
    if (record.createdAt instanceof Date) {
      activeDayKeys.add(startOfUtcDay(record.createdAt));
    }
  }

  // Build the 7-day result
  const days: WeeklyDay[] = weekDates.map((date, i) => {
    const dateKey = startOfUtcDay(date);
    return {
      label: DAY_LABELS[i],
      dateKey,
      isChecked: activeDayKeys.has(dateKey),
      isFuture: dateKey > todayKey,
    };
  });

  // Get streak days from all records
  const allRecords = await repo.learningRecord.findMany({
    where: { userId } as Record<string, unknown>,
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const uniqueDays = Array.from(
    new Set(
      allRecords
        .map((r) => r.createdAt)
        .filter((d): d is Date => d instanceof Date)
        .map((d) => startOfUtcDay(d)),
    ),
  ).sort((a, b) => b - a);

  let streakDays = 0;
  if (uniqueDays.length > 0) {
    const yesterdayKey = todayKey - 24 * 60 * 60 * 1000;
    if (uniqueDays[0] === todayKey || uniqueDays[0] === yesterdayKey) {
      streakDays = 1;
      for (let i = 1; i < uniqueDays.length; i += 1) {
        if (uniqueDays[i - 1] - uniqueDays[i] === 24 * 60 * 60 * 1000) {
          streakDays += 1;
        } else {
          break;
        }
      }
    }
  }

  return { days, streakDays };
}
