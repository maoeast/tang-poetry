import { db } from "@/lib/db";
import { syncReviewStateFromLearningEvent } from "@/lib/review/scheduler";
import {
  judgeAuthor,
  judgeCouplet,
  judgeOrdering,
  judgeTitle,
  normalizeAnswer,
} from "@/lib/challenge/judge";

type RandomSource = () => number;

export const CHALLENGE_ROUND_CONFIG = {
  total: 5,
  couplet: 2,
  author: 1,
  title: 1,
  ordering: 1,
} as const;

export type ChallengeMode = "default" | "review";

export type ChallengeQuestionType = "couplet" | "author" | "title" | "ordering";

export type ChallengePoetrySeed = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: string[];
};

type BaseQuestion = {
  id: string;
  poetryId: string;
  type: ChallengeQuestionType;
  title: string;
  prompt: string;
  promptLineIndex?: number;
};

export type CoupletQuestion = BaseQuestion & {
  type: "couplet";
  expectedAnswer: string;
};

export type AuthorQuestion = BaseQuestion & {
  type: "author";
  expectedAnswer: string;
  options: string[];
};

export type TitleQuestion = BaseQuestion & {
  type: "title";
  expectedAnswer: string;
  options: string[];
};

export type OrderingQuestion = BaseQuestion & {
  type: "ordering";
  expectedAnswer: string[];
  options: string[];
};

export type ChallengeQuestion =
  | CoupletQuestion
  | AuthorQuestion
  | TitleQuestion
  | OrderingQuestion;

export type ChallengeRound = {
  questions: ChallengeQuestion[];
};

type ChallengeRepository = {
  poetry?: {
    findMany: (args: {
      take: number;
      select: {
        id: true;
        title: true;
        author: true;
        dynasty: true;
        lines: true;
      };
      orderBy: { createdAt: "asc" };
    }) => Promise<
      Array<{
        id: string;
        title: string;
        author: string;
        dynasty: string;
        lines: unknown;
      }>
    >;
  };
  challengeAttempt?: {
    create: (args: {
      data: {
        userId: string;
        poetryId: string;
        questionType: string;
        promptLineIndex: number | null;
        userAnswer: string;
        isCorrect: boolean;
      };
    }) => Promise<unknown>;
  };
  learningRecord?: {
    create: (args: {
      data: {
        userId: string;
        poetryId: string;
        eventType: string;
      };
    }) => Promise<unknown>;
  };
  reviewState?: {
    findMany: (args: {
      where: {
        userId: string;
      };
      select: {
        poetryId: true;
      };
      orderBy: [{ wrongCount: "desc" }, { nextReviewAt: "asc" }];
      take: number;
    }) => Promise<Array<{ poetryId: string }>>;
  };
};

type BuildOptions = {
  mode?: ChallengeMode;
  poetryId?: string;
  reviewPoetryIds?: string[];
  random?: RandomSource;
};

type GetChallengePoetrySeedOptions = {
  mode?: ChallengeMode;
  poetryId?: string;
  userId?: string;
};

type SubmitAnswerInput = {
  question: ChallengeQuestion;
  userAnswer: string | string[];
};

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function randomIndex(length: number, random: RandomSource) {
  if (length <= 1) {
    return 0;
  }

  return Math.min(length - 1, Math.floor(random() * length));
}

function shuffleItems<T>(items: T[], random: RandomSource) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = nextItems[index];
    nextItems[index] = nextItems[swapIndex] as T;
    nextItems[swapIndex] = currentValue as T;
  }

  return nextItems;
}

function pickDistractors(
  values: string[],
  expectedValue: string,
  random: RandomSource,
  count = 3,
) {
  const unique = Array.from(new Set(values.filter((value) => value !== expectedValue)));
  return shuffleItems(unique, random).slice(0, count);
}

function sameNormalizedLineOrder(a: string[], b: string[]) {
  return a.every((line, index) => normalizeAnswer(line) === normalizeAnswer(b[index] ?? ""));
}

function ensurePoemHasCouplet(poem: ChallengePoetrySeed) {
  return poem.lines.length >= 2;
}

function prioritizePoems(
  poems: ChallengePoetrySeed[],
  options?: Pick<BuildOptions, "mode" | "poetryId" | "reviewPoetryIds">,
) {
  if (poems.length === 0) {
    return [];
  }

  const byId = new Map(poems.map((poem) => [poem.id, poem]));
  const prioritizedIds =
    options?.mode === "review"
      ? options.reviewPoetryIds ?? []
      : options?.poetryId
        ? [options.poetryId]
        : [];

  const prioritized = prioritizedIds
    .map((poetryId) => byId.get(poetryId))
    .filter((poem): poem is ChallengePoetrySeed => Boolean(poem));

  const prioritizedSet = new Set(prioritized.map((poem) => poem.id));
  const remainder = poems.filter((poem) => !prioritizedSet.has(poem.id));

  return [...prioritized, ...remainder];
}

function pickPoemAt<T extends ChallengePoetrySeed>(
  poems: T[],
  index: number,
) {
  if (poems.length === 0) {
    return undefined;
  }

  return poems[index % poems.length];
}

export function buildOrderingQuestion(
  poem: ChallengePoetrySeed,
  options?: BuildOptions,
): OrderingQuestion {
  const random = options?.random ?? Math.random;
  const originalLines = poem.lines.slice(0, Math.min(4, poem.lines.length));
  let shuffled = shuffleItems(originalLines, random);
  let attempts = 0;

  while (sameNormalizedLineOrder(shuffled, originalLines) && attempts < 5) {
    shuffled = shuffleItems(originalLines, random);
    attempts += 1;
  }

  if (sameNormalizedLineOrder(shuffled, originalLines) && originalLines.length > 1) {
    shuffled = [...originalLines.slice(1), originalLines[0] ?? ""];
  }

  return {
    id: `ordering-${poem.id}`,
    poetryId: poem.id,
    type: "ordering",
    title: "把诗句排成正确顺序",
    prompt: `${poem.title} · ${poem.author}`,
    expectedAnswer: originalLines,
    options: shuffled,
  };
}

function buildCoupletQuestion(
  poem: ChallengePoetrySeed,
  options?: BuildOptions,
): CoupletQuestion {
  const random = options?.random ?? Math.random;
  const promptLineIndex = randomIndex(poem.lines.length - 1, random);

  return {
    id: `couplet-${poem.id}-${promptLineIndex}`,
    poetryId: poem.id,
    type: "couplet",
    title: "补全下句",
    prompt: poem.lines[promptLineIndex] ?? "",
    promptLineIndex,
    expectedAnswer: poem.lines[promptLineIndex + 1] ?? "",
  };
}

function buildAuthorQuestion(
  poem: ChallengePoetrySeed,
  poems: ChallengePoetrySeed[],
  options?: BuildOptions,
): AuthorQuestion {
  const random = options?.random ?? Math.random;
  const optionsList = shuffleItems(
    [poem.author, ...pickDistractors(poems.map((item) => item.author), poem.author, random)],
    random,
  );

  return {
    id: `author-${poem.id}`,
    poetryId: poem.id,
    type: "author",
    title: "这首诗是谁写的",
    prompt: poem.title,
    expectedAnswer: poem.author,
    options: optionsList,
  };
}

function buildTitleQuestion(
  poem: ChallengePoetrySeed,
  poems: ChallengePoetrySeed[],
  options?: BuildOptions,
): TitleQuestion {
  const random = options?.random ?? Math.random;
  const optionsList = shuffleItems(
    [poem.title, ...pickDistractors(poems.map((item) => item.title), poem.title, random)],
    random,
  );

  return {
    id: `title-${poem.id}`,
    poetryId: poem.id,
    type: "title",
    title: "下面哪一个是这首诗的题目",
    prompt: poem.lines[0] ?? poem.author,
    expectedAnswer: poem.title,
    options: optionsList,
  };
}

export function buildChallengeRound(
  poems: ChallengePoetrySeed[],
  options?: BuildOptions,
): ChallengeRound {
  const random = options?.random ?? Math.random;
  const prioritizedUsablePoems = prioritizePoems(
    poems.filter((poem) => poem.lines.length > 0),
    options,
  );
  const usablePoems =
    options?.mode === "review" && (options.reviewPoetryIds?.length ?? 0) > 0
      ? prioritizedUsablePoems.filter((poem) =>
          new Set(options.reviewPoetryIds).has(poem.id),
        )
      : prioritizedUsablePoems;
  const coupletPoems = usablePoems.filter(ensurePoemHasCouplet);

  if (
    coupletPoems.length === 0 ||
    usablePoems.length === 0
  ) {
    return { questions: [] };
  }

  const firstCoupletPoem = pickPoemAt(coupletPoems, 0);
  const secondCoupletPoem = pickPoemAt(coupletPoems, 1) ?? firstCoupletPoem;
  const authorPoem = pickPoemAt(usablePoems, 2) ?? pickPoemAt(usablePoems, 0);
  const titlePoem = pickPoemAt(usablePoems, 3) ?? pickPoemAt(usablePoems, 0);
  const orderingPoem = pickPoemAt(coupletPoems, 4) ?? firstCoupletPoem;

  if (
    !firstCoupletPoem ||
    !secondCoupletPoem ||
    !authorPoem ||
    !titlePoem ||
    !orderingPoem
  ) {
    return { questions: [] };
  }

  return {
    questions: [
      buildCoupletQuestion(firstCoupletPoem, { random }),
      buildCoupletQuestion(secondCoupletPoem, { random }),
      buildAuthorQuestion(authorPoem, poems, { random }),
      buildTitleQuestion(titlePoem, poems, { random }),
      buildOrderingQuestion(orderingPoem, { random }),
    ],
  };
}

export async function getChallengePoetrySeeds(
  repository?: ChallengeRepository,
  options?: GetChallengePoetrySeedOptions,
): Promise<ChallengePoetrySeed[]> {
  const targetRepository = repository ?? (db as unknown as ChallengeRepository);

  if (!targetRepository.poetry) {
    return [];
  }

  const poetries = await targetRepository.poetry.findMany({
    take: 12,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      author: true,
      dynasty: true,
      lines: true,
    },
  });

  const seeds = poetries.map((poetry) => ({
    id: poetry.id,
    title: poetry.title,
    author: poetry.author,
    dynasty: poetry.dynasty,
    lines: toStringArray(poetry.lines),
  }));

  if (options?.mode !== "review" || !targetRepository.reviewState) {
    return options?.poetryId
      ? prioritizePoems(seeds, {
          poetryId: options.poetryId,
        })
      : seeds;
  }

  const reviewRecords = await targetRepository.reviewState.findMany({
    where: {
      userId: options.userId ?? process.env.SYSTEM_USER_ID ?? "",
    },
    select: {
      poetryId: true,
    },
    orderBy: [{ wrongCount: "desc" }, { nextReviewAt: "asc" }],
    take: 12,
  });

  return prioritizePoems(seeds, {
    mode: "review",
    reviewPoetryIds: reviewRecords.map((record) => record.poetryId),
  });
}

function judgeQuestion(question: ChallengeQuestion, userAnswer: string | string[]) {
  switch (question.type) {
    case "couplet":
      return judgeCouplet(String(userAnswer), question.expectedAnswer);
    case "author":
      return judgeAuthor(String(userAnswer), question.expectedAnswer);
    case "title":
      return judgeTitle(String(userAnswer), question.expectedAnswer);
    case "ordering":
      return judgeOrdering(
        Array.isArray(userAnswer) ? userAnswer : [String(userAnswer)],
        question.expectedAnswer,
      );
  }
}

function serializeUserAnswer(userAnswer: string | string[]) {
  if (Array.isArray(userAnswer)) {
    return userAnswer.map((item) => normalizeAnswer(item)).join("|");
  }

  return normalizeAnswer(userAnswer);
}

export async function submitChallengeAnswer(
  input: SubmitAnswerInput,
  repository?: ChallengeRepository,
) {
  const userId = process.env.SYSTEM_USER_ID;
  const targetRepository = repository ?? (db as unknown as ChallengeRepository);
  const isCorrect = judgeQuestion(input.question, input.userAnswer);

  if (userId && targetRepository.challengeAttempt) {
    await targetRepository.challengeAttempt.create({
      data: {
        userId,
        poetryId: input.question.poetryId,
        questionType: input.question.type,
        promptLineIndex: input.question.promptLineIndex ?? null,
        userAnswer: serializeUserAnswer(input.userAnswer),
        isCorrect,
      },
    });
  }

  if (userId && targetRepository.learningRecord) {
    await targetRepository.learningRecord.create({
      data: {
        userId,
        poetryId: input.question.poetryId,
        eventType: isCorrect ? "challenge_correct" : "challenge_wrong",
      },
    });
  }

  if (!repository) {
    await syncReviewStateFromLearningEvent({
      poetryId: input.question.poetryId,
      eventType: isCorrect ? "challenge_correct" : "challenge_wrong",
    });
  }

  return {
    isCorrect,
    normalizedAnswer: serializeUserAnswer(input.userAnswer),
  };
}
