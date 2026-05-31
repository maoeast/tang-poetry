import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("package.json exposes a Playwright smoke script", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.["test:smoke"],
    "playwright test tests/e2e/smoke.spec.ts",
  );
  assert.equal(packageJson.devDependencies?.["@playwright/test"], "^1.54.2");
});

test(".env.example documents DeepSeek, app auth, and audio variables", () => {
  const envExample = readFileSync(".env.example", "utf8");

  assert.match(envExample, /DEEPSEEK_API_KEY=""/);
  assert.match(envExample, /APP_PASSWORD="set-a-family-password"/);
  assert.match(envExample, /STEPFUN_API_KEY=""/);
  assert.match(envExample, /AUDIO_BASE_URL/);
});
