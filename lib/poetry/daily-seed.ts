export type DailyPoetrySeed = {
  date: string;
  poetryId: string;
};

export type SourceRotation = {
  source: string;
  poetryIds: string[];
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

/**
 * Build interleaved daily seeds from multiple sources.
 * Sources rotate round-robin (day 0 = source 0, day 1 = source 1, ...),
 * each cycling independently through its own poem list.
 */
export function buildInterleavedDailySeeds(
  sources: SourceRotation[],
  startDate = new Date(),
  totalDays = 365,
): DailyPoetrySeed[] {
  if (sources.length === 0) {
    return [];
  }

  const start = startOfUtcDay(startDate);
  const cursors = sources.map(() => 0);

  return Array.from({ length: totalDays }, (_, dayIndex) => {
    const currentDate = new Date(start.getTime() + dayIndex * DAY_IN_MS);
    const sourceIndex = dayIndex % sources.length;
    const src = sources[sourceIndex]!;
    const cursor = cursors[sourceIndex]!;
    cursors[sourceIndex] = cursor + 1;

    return {
      date: formatSeedDate(currentDate),
      poetryId: src.poetryIds[cursor % src.poetryIds.length]!,
    };
  });
}
