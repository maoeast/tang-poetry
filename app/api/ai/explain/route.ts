import { db } from "@/lib/db";
import { explainPoetry, type PoetryExplanation } from "@/lib/ai/deepseek";
import {
  getExplanationCacheKey,
  isExplanationAudience,
} from "@/lib/ai/prompts";

type PoetryExplanationCache = Record<string, PoetryExplanation>;

type ExplainRoutePoetryRecord = {
  id: string;
  title: string;
  author: string;
  lines: unknown;
  aiExplanation: unknown;
};

type ExplainRouteRepository = {
  poetry: {
    findUnique: (args: {
      where: { id: string };
      select: {
        id: true;
        title: true;
        author: true;
        lines: true;
        aiExplanation: true;
      };
    }) => Promise<ExplainRoutePoetryRecord | null>;
    update: (args: {
      where: { id: string };
      data: {
        aiExplanation: PoetryExplanationCache;
      };
    }) => Promise<unknown>;
  };
};

type HandleExplainPoetryOptions = {
  repository?: ExplainRouteRepository;
  explainPoetryImpl?: typeof explainPoetry;
};

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toExplanationCache(value: unknown): PoetryExplanationCache {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value);

  return Object.fromEntries(
    entries.filter(([, item]) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return false;
      }

      const candidate = item as Partial<PoetryExplanation>;

      return (
        typeof candidate.summary === "string" &&
        typeof candidate.imagery === "string" &&
        typeof candidate.emotion === "string" &&
        typeof candidate.cachedAt === "string"
      );
    }),
  );
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function notFound(message: string) {
  return Response.json({ error: message }, { status: 404 });
}

export async function handleExplainPoetry(
  request: Request,
  options: HandleExplainPoetryOptions = {},
) {
  const repository =
    options.repository ?? (db as unknown as ExplainRouteRepository);
  const explainPoetryImpl = options.explainPoetryImpl ?? explainPoetry;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!payload || typeof payload !== "object") {
    return badRequest("Invalid request body.");
  }

  const poetryId = "poetryId" in payload ? payload.poetryId : undefined;
  const audience = "audience" in payload ? payload.audience : undefined;

  if (typeof poetryId !== "string" || poetryId.length === 0) {
    return badRequest("Poetry id is required.");
  }

  if (!isExplanationAudience(audience)) {
    return badRequest("Unsupported audience.");
  }

  const poetry = await repository.poetry.findUnique({
    where: { id: poetryId },
    select: {
      id: true,
      title: true,
      author: true,
      lines: true,
      aiExplanation: true,
    },
  });

  if (!poetry) {
    return notFound("Poetry not found.");
  }

  const cache = toExplanationCache(poetry.aiExplanation);
  const cacheKey = getExplanationCacheKey(audience);
  const cachedExplanation = cache[cacheKey];

  if (cachedExplanation) {
    return Response.json(cachedExplanation);
  }

  const explanation = await explainPoetryImpl({
    title: poetry.title,
    author: poetry.author,
    lines: toStringArray(poetry.lines),
    audience,
  });

  const nextCache = {
    ...cache,
    [cacheKey]: explanation,
  };

  await repository.poetry.update({
    where: { id: poetry.id },
    data: {
      aiExplanation: nextCache,
    },
  });

  return Response.json(explanation);
}

export async function POST(request: Request) {
  return handleExplainPoetry(request);
}
