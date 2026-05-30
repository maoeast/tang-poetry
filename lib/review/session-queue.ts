export const REVIEW_QUEUE_KEY = "tang-poetry.review.queue";

type ReviewQueuePayload = {
  poetryIds: string[];
  activePoetryId: string;
  savedAt: string;
};

export function writeReviewQueue(poetryIds: string[], activePoetryId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPoetryIds = Array.from(
    new Set(poetryIds.filter((poetryId) => poetryId.length > 0)),
  );

  if (normalizedPoetryIds.length === 0) {
    window.sessionStorage.removeItem(REVIEW_QUEUE_KEY);
    return;
  }

  const payload: ReviewQueuePayload = {
    poetryIds: normalizedPoetryIds,
    activePoetryId,
    savedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(payload));
}

export function readReviewQueue() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(REVIEW_QUEUE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ReviewQueuePayload>;
    const poetryIds = Array.isArray(parsed.poetryIds)
      ? parsed.poetryIds.filter((poetryId): poetryId is string => typeof poetryId === "string")
      : [];

    if (poetryIds.length === 0 || typeof parsed.activePoetryId !== "string") {
      return null;
    }

    return {
      poetryIds,
      activePoetryId: parsed.activePoetryId,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : null,
    };
  } catch {
    return null;
  }
}
