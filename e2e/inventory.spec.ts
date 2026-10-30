import { expect, test } from "@playwright/test";
import { main, startEmpty } from "./helpers";

test("create, update, use and delete an inventory item", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: "Your kitchen is empty" })).toBeVisible();
  await main(page).getByRole("link", { name: "Add Food" }).first().click();

  // Validation
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByText("Enter a name.")).toBeVisible();

  // Name-based suggestions: frozen -> freezer
  await page.getByLabel("Name").fill("Frozen blueberries");
  await page.getByLabel("Quantity").click();
  await expect(page.getByRole("radio", { name: "Freezer" })).toBeChecked();
  await page.getByLabel("Quantity").fill("2");
  await page.getByRole("button", { name: "Save item" }).click();

  await expect(page).toHaveURL(/\/inventory\?location=freezer/);
  const row = page.getByRole("listitem").filter({ hasText: "Frozen blueberries" });
  await expect(row).toBeVisible();
  await expect(row.getByLabel("Quantity 2")).toBeVisible();

  await row.getByRole("button", { name: "Use one Frozen blueberries" }).click();
  await expect(row.getByLabel("Quantity 1")).toBeVisible();
  await row.getByRole("button", { name: "Add one Frozen blueberries" }).click();
  await expect(row.getByLabel("Quantity 2")).toBeVisible();

  // Edit
  await row.getByRole("link", { name: "Edit Frozen blueberries" }).click();
  await page.getByLabel("Name").fill("Wild blueberries");
  await page.getByRole("radio", { name: "Fridge" }).check({ force: true });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/location=fridge/);
  const edited = page.getByRole("listitem").filter({ hasText: "Wild blueberries" });
  await expect(edited).toBeVisible();

  // Search
  await page.goto("/inventory");
  await page.getByLabel("Search inventory").fill("zzz");
  await expect(page.getByRole("heading", { name: "No matching items" })).toBeVisible();
  await page.getByLabel("Search inventory").fill("blue");
  await expect(page.getByRole("listitem").filter({ hasText: "Wild blueberries" })).toBeVisible();

  // Delete with confirmation
  await page.getByRole("button", { name: "Delete Wild blueberries" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete item?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted Wild blueberries.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your kitchen is empty" })).toBeVisible();
});

test("data persists across reloads", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/inventory/new?location=pantry");
  await page.getByLabel("Name").fill("Basmati rice");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Basmati rice" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Basmati rice" })).toBeVisible();
});

test("corrupt local data shows an error with a working reset", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("pantryiq:v1", "{broken"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Couldn't load your kitchen" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset data on this device" }).click();
  await expect(page.getByRole("button", { name: "Load sample kitchen" })).toBeVisible();
});
