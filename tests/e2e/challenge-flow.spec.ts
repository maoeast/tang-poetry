import { test, expect } from "playwright/test";

/**
 * E2E test: Challenge answer submission flow.
 *
 * Verifies the full browser → server action → DB write chain by:
 * 1. Unlocking the app
 * 2. Starting a challenge round
 * 3. Answering all 5 questions (couplet ×2, author, title, ordering)
 * 4. Verifying feedback and summary
 */

const APP_PASSWORD = process.env.APP_PASSWORD ?? "family123";
const POETRY_ID = "ts300-0003";

test("challenge round: submit answers for all 5 questions", async ({ page }) => {
  // Unlock the app
  await page.goto("/unlock");
  await page.getByLabel("访问口令").fill(APP_PASSWORD);
  await page.getByRole("button", { name: "进入应用" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Navigate to challenge page
  await page.goto(`/challenge?poetryId=${POETRY_ID}`);
  await expect(page.getByRole("heading", { name: "挑战闯关" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始挑战" })).toBeVisible();

  // Start the round
  await page.getByRole("button", { name: "开始挑战" }).click();

  // Answer all 5 questions
  for (let i = 0; i < 5; i += 1) {
    // Wait for the question to appear
    const questionHeader = page.getByText(new RegExp(`第 ${i + 1} / 5 题`));
    await expect(questionHeader).toBeVisible({ timeout: 5_000 });

    // Determine question type from the badge
    const typeMap: Record<string, string> = {
      "对句": "couplet", "选作者": "author", "选诗名": "title", "排序": "ordering",
    };
    const typeBadge = page.locator("span.rounded-full.bg-primary\\/10");
    const badgeText = await typeBadge.textContent();
    const questionType = typeMap[badgeText ?? ""] ?? badgeText;

    if (questionType === "couplet") {
      // Couplet: type something in the input
      const input = page.getByPlaceholder("例如：处处闻啼鸟");
      await input.fill("测试答案");
      await page.getByRole("button", { name: "提交答案" }).click();
    } else if (questionType === "author" || questionType === "title") {
      // Choice: click the first option
      const options = page.locator(
        "div.grid.gap-3 button[type='button'].rounded-\\[1\\.25rem\\]"
      );
      await options.first().click();
      await page.getByRole("button", { name: "提交答案" }).click();
    } else if (questionType === "ordering") {
      // Ordering: answer is pre-populated, just submit
      await page.getByRole("button", { name: "提交答案" }).click();
    }

    // Wait for feedback
    await expect(
      page.getByText(/回答正确|回答有误/)
    ).toBeVisible({ timeout: 10_000 });

    // Move to next question or see results
    const nextButton = page.getByRole("button", {
      name: i < 4 ? "下一题" : "查看结果",
    });
    await nextButton.click();
  }

  // Verify the summary page
  await expect(page.getByText("本轮完成")).toBeVisible();
  await expect(page.getByText(/你答对了 \d \/ 5 题/)).toBeVisible();

  // Verify each question result is shown
  const resultCards = page.locator(
    "div.rounded-\\[1\\.5rem\\].border.border-ink-200"
  );
  await expect(resultCards).toHaveCount(5);

  // "再来一轮" should be available
  await expect(page.getByRole("button", { name: "再来一轮" })).toBeVisible();
});
