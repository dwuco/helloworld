import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loadSample } from "./helpers";

test("email import is off by default and opt-in needs explicit consent", async ({ page }) => {
  await page.goto("/settings");
  const section = page.locator("#email");
  await expect(section.getByText("Off", { exact: true })).toBeVisible();
  await section.getByRole("button", { name: "Review email import…" }).click();
  const dialog = page.getByRole("dialog", { name: "Opt in to email import?" });
  await expect(dialog.getByRole("button", { name: "Opt in" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Keep it off" }).click();
  await expect(section.getByText("Off", { exact: true })).toBeVisible();

  await section.getByRole("button", { name: "Review email import…" }).click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Opt in" }).click();
  await expect(section.getByText("Opted in", { exact: true })).toBeVisible();
  await expect(page.getByText("No mailbox is connected.")).toBeVisible();
  await section.getByRole("button", { name: "Turn off email import" }).click();
  await expect(section.getByText("Off", { exact: true })).toBeVisible();
});

test("integrations page never presents unsupported integrations as live", async ({ page }) => {
  await page.goto("/settings/integrations");
  for (const name of ["Gmail", "Outlook / Microsoft 365"]) {
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });
    await expect(card.getByText("Not available yet")).toBeVisible();
    await expect(card.getByRole("button", { name: /connect/i })).toHaveCount(0);
  }
  for (const name of ["Walmart", "Sam's Club", "Costco"]) {
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card.getByText("Manual import only")).toBeVisible();
  }
  await expect(page.getByText("Available", { exact: true })).toHaveCount(0);
});

test("household section explains local mode when Supabase isn't configured", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Shared households aren't enabled on this deployment")).toBeVisible();
});

test("preferences save, backup export works, and delete-all clears data", async ({ page }) => {
  await loadSample(page);
  await page.goto("/settings");
  await page.getByLabel("Household name").fill("Casa Test");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Preferences saved.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Casa Test" })).toBeVisible();

  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^pantryiq-backup-.*\.json$/);

  await page.getByRole("button", { name: /Delete all/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText("All data deleted.")).toBeVisible();
  await expect(page.getByText(/^0 items/)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(await file.path());
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();
});

test("primary pages have no serious accessibility violations", async ({ page }) => {
  await loadSample(page);
  for (const path of ["/", "/inventory", "/inventory/new", "/import", "/recipes", "/recipes/veggie-omelette", "/meal-plan", "/shopping", "/settings", "/settings/integrations"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path}: ${v.id} – ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  }
});
