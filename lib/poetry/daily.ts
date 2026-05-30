import { db } from "@/lib/db";
import { getPoetryImage, type PoetryImage } from "@/lib/images/repository";

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
};

export type DailyPoetryResult = {
  date: string;
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

export async function getDailyPoetry(
  date: string,
  repository: DailyPoetryRepository = db,
  dependencies: DailyPoetryDependencies = { getPoetryImage },
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

  const image = await dependencies.getPoetryImage(entry.poetry.id);

  return {
    date: entry.date,
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
