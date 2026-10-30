import { expect, test } from "@playwright/test";
import { loadSample, main } from "./helpers";

const QUICK_ACTIONS: [RegExp, string, string][] = [
  [/^Add Food/, "/inventory/new", "Add Food"],
  [/^Import Groceries/, "/import", "Import Groceries"],
  [/^Find Recipes/, "/recipes", "Find Recipes"],
  [/^Meal Planner/, "/meal-plan", "Meal Planner"],
  [/^Shopping List/, "/shopping", "Shopping List"],
  [/^Settings/, "/settings", "Settings"],
];

test("every dashboard quick action opens its page", async ({ page }) => {
  await page.goto("/");
  for (const [name, path, heading] of QUICK_ACTIONS) {
    await main(page).getByRole("link", { name }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.goto("/");
  }
});

test("all routes render without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await loadSample(page);
  for (const path of ["/", "/inventory", "/inventory?location=freezer", "/inventory/new", "/import", "/recipes", "/recipes/chicken-stir-fry", "/meal-plan", "/shopping", "/settings", "/settings/integrations", "/offline"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("unknown routes and records show friendly not-found states", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/inventory/missing-id");
  await expect(page.getByRole("heading", { name: "Item not found" })).toBeVisible();
  await page.goto("/recipes/missing-id");
  await expect(page.getByRole("heading", { name: "Recipe not found" })).toBeVisible();
  await page.goto("/import/missing-id");
  await expect(page.getByRole("heading", { name: "Import not found" })).toBeVisible();
});

test("main navigation works on this viewport", async ({ page, isMobile }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const targets: [string, string][] = isMobile
    ? [["Food", "/inventory"], ["Recipes", "/recipes"], ["Plan", "/meal-plan"], ["Shop", "/shopping"], ["Home", "/"]]
    : [["Inventory", "/inventory"], ["Import Groceries", "/import"], ["Find Recipes", "/recipes"], ["Meal Planner", "/meal-plan"], ["Shopping List", "/shopping"], ["Settings", "/settings"], ["Dashboard", "/"]];
  for (const [name, path] of targets) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
  }
  if (isMobile) {
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page).toHaveURL("/settings");
    await page.getByRole("link", { name: "Add food" }).click();
    await expect(page).toHaveURL("/inventory/new");
    await page.getByRole("link", { name: "Import groceries" }).click();
    await expect(page).toHaveURL("/import");
  }
});

test("no horizontal scrolling on any primary page", async ({ page }) => {
  await loadSample(page);
  for (const path of ["/", "/inventory", "/import", "/recipes", "/recipes/beef-chili", "/meal-plan", "/shopping", "/settings", "/settings/integrations"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
