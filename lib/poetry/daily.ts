import { db } from "@/lib/db";
import { getPoetryImage, type PoetryImage } from "@/lib/images/repository";
import { toUtcDayKey } from "@/lib/poetry/view-record";

type DailyPoetryRepository = {
  dailyPoetry: {
    findUnique: (args: {
      where: { date: string };
      select: {
        date: true;
        poetry: {
          select: {
            id: true;
            title: true;
            author: true;
            dynasty: true;
            lines: true;
            imageKey: true;
            imageStatus: true;
          };
        };
      };
    }) => Promise<{
      date: string;
      poetry: {
        id: string;
        title: string;
        author: string;
        dynasty: string;
        lines: unknown;
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
  repository: DailyPoetryRepository = db,
  dependencies: DailyPoetryDependencies = { getPoetryImage },
  options?: {
    now?: Date;
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
          author: true,
          dynasty: true,
          lines: true,
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
  const image = await dependencies.getPoetryImage(entry.poetry.id);
  const isReadToday = await getIsReadToday(entry.poetry.id, repository, now);

  return {
    date: entry.date,
    isReadToday,
    poetry: {
      ...entry.poetry,
      lines: Array.isArray(entry.poetry.lines)
        ? entry.poetry.lines.filter((line): line is string => typeof line === "string")
        : [],
      image,
    },
  };
}

export async function getTodayPoetry(repository: DailyPoetryRepository = db) {
  return getDailyPoetry(getTodayDateString(), repository);
}
