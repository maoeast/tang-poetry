type ReviewPlayerQueueInput = {
  poetryId: string;
  initialQueuePoetryIds: string[];
};

type MergeReviewPlayerQueueInput = ReviewPlayerQueueInput & {
  persistedQueuePoetryIds: string[];
};

function normalizeQueuePoetryIds(poetryIds: string[]) {
  return Array.from(new Set(poetryIds.filter((poetryId) => poetryId.length > 0)));
}

export function buildInitialReviewPlayerQueue(input: ReviewPlayerQueueInput) {
  const normalized = normalizeQueuePoetryIds(input.initialQueuePoetryIds);

  if (normalized.includes(input.poetryId)) {
    return normalized;
  }

  return [input.poetryId, ...normalized];
}

export function mergePersistedReviewPlayerQueue(
  input: MergeReviewPlayerQueueInput,
) {
  const merged = normalizeQueuePoetryIds([
    ...input.initialQueuePoetryIds,
    ...input.persistedQueuePoetryIds,
  ]);

  if (merged.includes(input.poetryId)) {
    return merged;
  }

  return [input.poetryId, ...merged];
}
