import { expect, type Page } from "@playwright/test";

export async function startEmpty(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start empty" }).click();
  await expect(page.getByText("Ready. Add your first item!")).toBeVisible();
}

export async function loadSample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Load sample kitchen" }).click();
  await expect(page.getByText(/Sample kitchen loaded/)).toBeVisible();
}

export const main = (page: Page) => page.getByRole("main");
