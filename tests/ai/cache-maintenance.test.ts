import assert from "node:assert/strict";
import test from "node:test";

import { removeExplanationAudiences } from "@/lib/ai/cache-maintenance";

test("removeExplanationAudiences removes only the requested audience keys", () => {
  const result = removeExplanationAudiences(
    {
      child_v1: {
        summary: "child",
        imagery: "child",
        emotion: "child",
        cachedAt: "2026-06-01T00:00:00.000Z",
      },
      general_v1: {
        summary: "general",
        imagery: "general",
        emotion: "general",
        cachedAt: "2026-06-01T00:00:00.000Z",
      },
    },
    ["child"],
  );

  assert.deepEqual(result, {
    general_v1: {
      summary: "general",
      imagery: "general",
      emotion: "general",
      cachedAt: "2026-06-01T00:00:00.000Z",
    },
  });
});

test("removeExplanationAudiences returns null when all requested keys are removed", () => {
  const result = removeExplanationAudiences(
    {
      child_v1: {
        summary: "child",
        imagery: "child",
        emotion: "child",
        cachedAt: "2026-06-01T00:00:00.000Z",
      },
    },
    ["child"],
  );

  assert.equal(result, null);
});

test("removeExplanationAudiences returns null for invalid cache payloads", () => {
  assert.equal(removeExplanationAudiences(null, ["child"]), null);
  assert.equal(removeExplanationAudiences([], ["child"]), null);
});
