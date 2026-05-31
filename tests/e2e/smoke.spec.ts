import { test, expect } from "playwright/test";

const APP_PASSWORD = process.env.APP_PASSWORD ?? "family123";
const TODAY_POETRY_ID = "ts300-0003";
const REVIEW_POETRY_ID = "ts300-0002";

test("phase 1 smoke flow", async ({ page }) => {
  await page.goto("/unlock");
  await expect(page.getByRole("heading", { name: "输入访问口令" })).toBeVisible();

  await page.getByLabel("访问口令").fill(APP_PASSWORD);
  await page.getByRole("button", { name: "进入应用" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "唐诗画境" })).toBeVisible();

  await page.goto(`/poetry/${TODAY_POETRY_ID}`);
  await expect(page).toHaveURL(new RegExp(`/poetry/${TODAY_POETRY_ID}$`));
  await expect(page.getByText("译文与读法")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("今日已读")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "去挑战这首诗" }),
  ).toHaveAttribute("href", `/challenge?poetryId=${TODAY_POETRY_ID}`);

  await page.goto(`/challenge?poetryId=${TODAY_POETRY_ID}`);
  await expect(page.getByRole("heading", { name: "挑战闯关" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始挑战" })).toBeVisible();

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "复习批次入口" })).toBeVisible();

  await page.goto(`/review/${REVIEW_POETRY_ID}?from=upcoming&index=0`);
  await expect(page.getByText("Review Player")).toBeVisible();
  await expect(page.locator("h1", { hasText: "登幽州台歌" })).toBeVisible();

  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "把近来的读诗痕迹收成一轴小长卷" })).toBeVisible();
  await expect(page.getByText("诗人缘分榜")).toBeVisible();
});
