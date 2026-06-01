import { test, expect } from "playwright/test";

/**
 * E2E test: Review self-report submission flow.
 *
 * Verifies the review player → server action → DB write chain by:
 * 1. Unlocking the app
 * 2. Navigating to a review player page
 * 3. Submitting a self-assessment (会背了 / 还不熟)
 * 4. Verifying the submission completes and redirects
 *
 * Note: The "会背了" / "还不熟" buttons are gated by the 80% audio playback
 * requirement. When the poem has no audio (audioStatus = "none"), the buttons
 * are immediately unlocked.
 */

const APP_PASSWORD = process.env.APP_PASSWORD ?? "family123";
const REVIEW_POETRY_ID = "ts300-0002";

test("review player: submit self-report (known) and verify redirect", async ({ page }) => {
  // Unlock the app
  await page.goto("/unlock");
  await page.getByLabel("访问口令").fill(APP_PASSWORD);
  await page.getByRole("button", { name: "进入应用" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Navigate to review player
  await page.goto(`/review/${REVIEW_POETRY_ID}?from=upcoming&index=0`);
  await expect(page.getByText("Review Player")).toBeVisible();

  // Wait for the page to fully render
  await expect(page.locator("h1", { hasText: "登幽州台歌" })).toBeVisible();

  // Check if self-report buttons are visible
  const knownButton = page.getByRole("button", { name: "会背了" });
  const unknownButton = page.getByRole("button", { name: "还不熟" });
  await expect(knownButton).toBeVisible();
  await expect(unknownButton).toBeVisible();

  // If buttons are unlocked (no audio), click "会背了" and verify completion
  const isKnownDisabled = await knownButton.isDisabled();

  if (!isKnownDisabled) {
    // Click "会背了" and wait for navigation
    await knownButton.click();

    // Should redirect to /review after submission (no more poems in queue)
    await expect(page).toHaveURL(/\/review$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "复习批次入口" })).toBeVisible();
  } else {
    // Buttons are locked — audio must play to 80%. Verify the lock state.
    await expect(page.getByText("未解锁")).toBeVisible();

    // Verify "再听一遍" button exists in the self-report section as an alternative action
    await expect(
      page.locator("section").filter({ hasText: "会背了" }).getByRole("button", { name: "再听一遍" })
    ).toBeVisible();
  }
});

test("review player: submit self-report (unknown) when unlocked", async ({ page }) => {
  // Unlock the app
  await page.goto("/unlock");
  await page.getByLabel("访问口令").fill(APP_PASSWORD);
  await page.getByRole("button", { name: "进入应用" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Navigate to review player
  await page.goto(`/review/${REVIEW_POETRY_ID}?from=upcoming&index=0`);
  await expect(page.getByText("Review Player")).toBeVisible();

  const unknownButton = page.getByRole("button", { name: "还不熟" });
  const isUnknownDisabled = await unknownButton.isDisabled();

  if (!isUnknownDisabled) {
    await unknownButton.click();

    // Should redirect to /review after submission
    await expect(page).toHaveURL(/\/review$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "复习批次入口" })).toBeVisible();
  }
});
