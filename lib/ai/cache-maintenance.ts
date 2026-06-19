import { getExplanationCacheKey, type ExplanationAudience } from "@/lib/ai/prompts";

export type PoetryExplanationCacheRecord = {
  summary: string;
  imagery: string;
  emotion: string;
  cachedAt: string;
};

export type PoetryExplanationCache = Record<string, PoetryExplanationCacheRecord>;

export function removeExplanationAudiences(
  cache: unknown,
  audiences: ExplanationAudience[],
) {
  if (!cache || typeof cache !== "object" || Array.isArray(cache)) {
    return null;
  }

  const nextCache = { ...(cache as Record<string, unknown>) };

  for (const audience of audiences) {
    delete nextCache[getExplanationCacheKey(audience)];
  }

  return Object.keys(nextCache).length > 0 ? nextCache : null;
}
