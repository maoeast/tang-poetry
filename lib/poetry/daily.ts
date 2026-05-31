import { db } from "@/lib/db";
import { getPoetryImage, type PoetryImage } from "@/lib/images/repository";
import {
  pickPoetryContentVariant,
  type ScriptVariant,
} from "@/lib/poetry/script-variant";
import { toUtcDayKey } from "@/lib/poetry/view-record";

type DailyPoetryRepository = {
  dailyPoetry: {
    findUnique: (args: {
      where: { date: string };
      select: Record<string, unknown>;
    }) => Promise<{
      date: string;
      poetry: {
        id: string;
        title: string;
        titleOriginal?: string | null;
        titleZhHans?: string | null;
        titleZhHant?: string | null;
        author: string;
        authorOriginal?: string | null;
        authorZhHans?: string | null;
        authorZhHant?: string | null;
        dynasty: string;
        lines: unknown;
        linesZhHans?: unknown;
        linesZhHant?: unknown;
        imageKey: string | null;
        imageStatus: string;
      };
    } | null>;
  };
  learningRecord?: {
    findMany?: (args: {
      where: {
        userId: string;
        poetryId: string;
        eventType: string;
      };
      select: {
        createdAt: true;
      };
      orderBy: {
        createdAt: "asc" | "desc";
      };
    }) => Promise<Array<{ createdAt: Date }>>;
  };
};

export type DailyPoetryResult = {
  date: string;
  isReadToday: boolean;
  poetry: {
    id: string;
    title: string;
    author: string;
    dynasty: string;
    lines: string[];
    imageKey: string | null;
    imageStatus: string;
    image: PoetryImage;
  };
};

type DailyPoetryDependencies = {
  getPoetryImage: (poetryId: string) => Promise<PoetryImage>;
};

export function getTodayDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function getIsReadToday(
  poetryId: string,
  repository: DailyPoetryRepository,
  now: Date,
) {
  const userId = process.env.SYSTEM_USER_ID;

  if (!userId || !repository.learningRecord?.findMany) {
    return false;
  }

  const records = await repository.learningRecord.findMany({
    where: {
      userId,
      poetryId,
      eventType: "view_poetry",
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const todayKey = toUtcDayKey(now);

  return records.some((record) => toUtcDayKey(record.createdAt) === todayKey);
}

export async function getDailyPoetry(
  date: string,
  repository: DailyPoetryRepository = db as unknown as DailyPoetryRepository,
  dependencies: DailyPoetryDependencies = { getPoetryImage },
  options?: {
    now?: Date;
    scriptVariant?: ScriptVariant;
  },
): Promise<DailyPoetryResult | null> {
  const entry = await repository.dailyPoetry.findUnique({
    where: { date },
    select: {
      date: true,
      poetry: {
        select: {
          id: true,
          title: true,
          titleOriginal: true,
          titleZhHans: true,
          titleZhHant: true,
          author: true,
          authorOriginal: true,
          authorZhHans: true,
          authorZhHant: true,
          dynasty: true,
          lines: true,
          linesZhHans: true,
          linesZhHant: true,
          imageKey: true,
          imageStatus: true,
        },
      },
    },
  });

  if (!entry) {
    return null;
  }

  const now = options?.now ?? new Date();
  const content = pickPoetryContentVariant(
    entry.poetry,
    options?.scriptVariant ?? "zh-Hans",
  );
  const image = await dependencies.getPoetryImage(entry.poetry.id);
  const isReadToday = await getIsReadToday(entry.poetry.id, repository, now);

  return {
    date: entry.date,
    isReadToday,
    poetry: {
      ...entry.poetry,
      title: content.title,
      author: content.author,
      lines: content.lines,
      image,
    },
  };
}

export async function getTodayPoetry(
  repository: DailyPoetryRepository = db as unknown as DailyPoetryRepository,
  dependencies: DailyPoetryDependencies = { getPoetryImage },
  options?: {
    now?: Date;
    scriptVariant?: ScriptVariant;
  },
) {
  return getDailyPoetry(getTodayDateString(), repository, dependencies, options);
}
