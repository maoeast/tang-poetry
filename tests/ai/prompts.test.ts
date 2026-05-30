import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPoetryExplanationMessages,
  getExplanationCacheKey,
  promptVersion,
  type ExplanationAudience,
} from "@/lib/ai/prompts";

test("promptVersion is fixed at v1 for phase one", () => {
  assert.equal(promptVersion, "v1");
});

test("getExplanationCacheKey uses the required audience_promptVersion format", () => {
  assert.equal(getExplanationCacheKey("child"), "child_v1");
  assert.equal(getExplanationCacheKey("general"), "general_v1");
});

test("buildPoetryExplanationMessages keeps the explanation scoped to the original poem", () => {
  const audience: ExplanationAudience = "child";

  const messages = buildPoetryExplanationMessages({
    title: "静夜思",
    author: "李白",
    lines: ["床前明月光。", "疑是地上霜。"],
    audience,
  });

  assert.match(messages.system, /只做讲解/);
  assert.match(messages.system, /不要改写原诗/);
  assert.match(messages.user, /静夜思/);
  assert.match(messages.user, /李白/);
  assert.match(messages.user, /床前明月光。/);
  assert.match(messages.user, /儿童/);
});
