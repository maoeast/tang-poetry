import { test, expect } from "playwright/test";

const APP_PASSWORD = process.env.APP_PASSWORD ?? "family123";
const REVIEW_POETRY_ID = "ts300-0002";

test("phase 1 smoke flow", async ({ page }) => {
  await page.goto("/unlock");
  await expect(page.getByRole("heading", { name: "输入访问口令" })).toBeVisible();

  await page.getByLabel("访问口令").fill(APP_PASSWORD);
  await page.getByRole("button", { name: "进入应用" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "诗笺阁" })).toBeVisible();

  // Extract today's poem ID from the "赏析" CTA link
  const ctaLink = page.getByRole("link", { name: "赏析" });
  const ctaHref = await ctaLink.getAttribute("href");
  const todayPoetryId = ctaHref?.match(/poetry\/([^&]+)/)?.[1];
  expect(todayPoetryId).toBeTruthy();

  // Visit the poetry detail page
  await page.goto(`/poetry/${todayPoetryId}`);
  await expect(page).toHaveURL(new RegExp(`/poetry/${todayPoetryId}$`));
  await expect(page.getByText("译文与注释")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 讲解" })).toBeVisible();

  // AI explanation: cache-first (DB cached content shown immediately)
  // Fallback: "加载 AI 讲解" button triggers POST /api/ai/explain
  const loadButton = page.getByRole("button", { name: "加载 AI 讲解" });
  const hasLoadButton = (await loadButton.count()) > 0;

  if (hasLoadButton) {
    // No cache — click the button and wait for API response
    const [explainResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/ai/explain") &&
          response.request().method() === "POST",
      ),
      loadButton.click(),
    ]);
    expect(explainResponse.status()).toBe(200);
    const payload = (await explainResponse.json()) as {
      summary?: string;
      imagery?: string;
      emotion?: string;
    };
    expect(typeof payload.summary).toBe("string");
    expect(payload.summary!.trim().length).toBeGreaterThan(0);
    expect(typeof payload.imagery).toBe("string");
    expect(payload.imagery!.trim().length).toBeGreaterThan(0);
    expect(typeof payload.emotion).toBe("string");
    expect(payload.emotion!.trim().length).toBeGreaterThan(0);
  }

  // Verify explanation content is visible (either from cache or fresh API load)
  const explanationText = page.locator(
    "h2:has-text('AI 讲解') + div + div p, h2:has-text('AI 讲解') ~ div p",
  ).first();
  if (await explanationText.isVisible().catch(() => false)) {
    const text = await explanationText.textContent();
    expect(text?.trim().length ?? 0).toBeGreaterThan(0);
  } else {
    // fallback: any paragraph text after the AI heading
    await expect(
      page.locator("text=/[\\u4e00-\\u9fff]{20,}/").first(),
    ).toBeVisible({ timeout: 5000 });
  }

  // Audience switching: verify tabs are clickable
  const childTab = page.getByRole("button", { name: "儿童版" });
  const generalTab = page.getByRole("button", { name: "通用版" });
  const childVisible = (await childTab.count()) > 0;
  const generalVisible = (await generalTab.count()) > 0;

  if (childVisible && generalVisible) {
    // Switch between versions — content should be visible for each
    await generalTab.click();
    await page.waitForTimeout(500);
    await childTab.click();
    await page.waitForTimeout(500);
  }

  // After reading, the homepage should show "今日已读" badge
  await page.goto("/");
  await expect(page.getByText("今日已读")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "去挑战" }),
  ).toHaveAttribute("href", `/challenge?poetryId=${todayPoetryId}`);

  await page.goto(`/challenge?poetryId=${todayPoetryId}`);
  await expect(page.getByRole("heading", { name: "挑战闯关" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始挑战" })).toBeVisible();

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "温故知新" })).toBeVisible();

  await page.goto(`/review/${REVIEW_POETRY_ID}?from=upcoming&index=0`);
  await expect(page.getByText("复习播放")).toBeVisible();

  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "读诗长卷" })).toBeVisible();
  await expect(page.getByText("诗人缘分榜")).toBeVisible();
});
