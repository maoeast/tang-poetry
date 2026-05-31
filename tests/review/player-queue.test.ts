import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInitialReviewPlayerQueue,
  mergePersistedReviewPlayerQueue,
} from "@/lib/review/player-queue";

test("buildInitialReviewPlayerQueue keeps the first render aligned with the server queue", () => {
  const queue = buildInitialReviewPlayerQueue({
    poetryId: "ts300-0002",
    initialQueuePoetryIds: ["ts300-0002"],
  });

  assert.deepEqual(queue, ["ts300-0002"]);
});

test("mergePersistedReviewPlayerQueue appends persisted items after hydration", () => {
  const queue = mergePersistedReviewPlayerQueue({
    poetryId: "ts300-0002",
    initialQueuePoetryIds: ["ts300-0002"],
    persistedQueuePoetryIds: ["ts300-0002", "ts300-0003"],
  });

  assert.deepEqual(queue, ["ts300-0002", "ts300-0003"]);
});

test("mergePersistedReviewPlayerQueue keeps server order while restoring the current poetry", () => {
  const queue = mergePersistedReviewPlayerQueue({
    poetryId: "ts300-0002",
    initialQueuePoetryIds: ["ts300-0004"],
    persistedQueuePoetryIds: ["ts300-0003", "ts300-0004"],
  });

  assert.deepEqual(queue, ["ts300-0002", "ts300-0004", "ts300-0003"]);
});
