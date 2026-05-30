export type DailyPoetrySeed = {
  date: string;
  poetryId: string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function formatSeedDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function buildDailyPoetrySeeds(
  poetryIds: string[],
  startDate = new Date(),
  totalDays = 365,
): DailyPoetrySeed[] {
  if (poetryIds.length === 0) {
    return [];
  }

  const start = startOfUtcDay(startDate);

  return Array.from({ length: totalDays }, (_, index) => {
    const currentDate = new Date(start.getTime() + index * DAY_IN_MS);

    return {
      date: formatSeedDate(currentDate),
      poetryId: poetryIds[index % poetryIds.length],
    };
  });
}
