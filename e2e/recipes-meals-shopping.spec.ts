import { expect, test } from "@playwright/test";
import { loadSample, startEmpty } from "./helpers";

test("recipes rank by owned ingredients and feed the shopping list and meal plan", async ({ page }) => {
  await loadSample(page);
  await page.goto("/recipes");
  await page.getByRole("button", { name: /Ready to cook/ }).click();
  await expect(page.getByRole("link", { name: /Chicken Stir-Fry/ })).toBeVisible();

  await page.getByRole("button", { name: /^All/ }).click();
  await page.getByLabel("Search recipes").fill("tacos");
  await page.getByRole("link", { name: /Black Bean Tacos/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Black Bean Tacos" })).toBeVisible();

  await page.getByRole("button", { name: /missing to shopping list/ }).click();
  await expect(page.getByText(/to your shopping list/)).toBeVisible();

  await page.getByRole("button", { name: "Add to meal plan" }).click();
  const dialog = page.getByRole("dialog", { name: "Plan Black Bean Tacos" });
  await dialog.getByLabel("Meal").selectOption("lunch");
  await dialog.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByText("Planned Black Bean Tacos.")).toBeVisible();

  await page.goto("/shopping");
  await expect(page.getByText("cumin", { exact: true })).toBeVisible();
  await page.goto("/meal-plan");
  await expect(page.getByRole("link", { name: "Black Bean Tacos" })).toBeVisible();
});

test("meal planner: add, edit and delete a custom meal, change weeks", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/meal-plan");
  await page.getByRole("button", { name: "Add meal", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Add meal" });
  await dialog.getByRole("button", { name: "Add meal" }).click();
  await expect(dialog.getByText("Choose a recipe or enter a meal.")).toBeVisible();
  await dialog.getByLabel("Meal name").fill("Leftover soup");
  await dialog.getByRole("button", { name: "Add meal" }).click();
  await expect(page.getByText("Added Leftover soup.")).toBeVisible();

  await page.getByRole("button", { name: /Edit Leftover soup/ }).click();
  dialog = page.getByRole("dialog", { name: "Edit meal" });
  await dialog.getByLabel("Meal name").fill("Leftover chili");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Leftover chili")).toBeVisible();

  await page.getByRole("button", { name: "Next week" }).click();
  await expect(page.getByText("Leftover chili")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to this week" }).click();
  await page.getByRole("button", { name: /Edit Leftover chili/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Meal removed.")).toBeVisible();
});

test("shopping list: add, prevent duplicates, check off and move to inventory", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/shopping");
  await expect(page.getByRole("heading", { name: "Your list is empty" })).toBeVisible();
  await page.getByLabel("Add an item").fill("Greek yogurt");
  await page.getByRole("button", { name: "Add to list" }).click();
  await expect(page.getByText("Greek yogurt", { exact: true })).toBeVisible();
  await page.getByLabel("Add an item").fill("greek yogurt");
  await page.getByRole("button", { name: "Add to list" }).click();
  await expect(page.getByText("greek yogurt is already on your list.")).toBeVisible();

  await page.getByLabel("Add an item").fill("Bread");
  await page.getByRole("button", { name: "Add to list" }).click();
  await page.getByRole("button", { name: "Edit Bread" }).click();
  await page.getByRole("dialog").getByLabel("Quantity").fill("2");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("checkbox", { name: /Greek yogurt/ }).check();
  await page.getByRole("button", { name: "Move checked to inventory" }).click();
  await expect(page.getByText(/Moved 1 item to inventory/)).toBeVisible();
  await expect(page.getByText("Greek yogurt", { exact: true })).toHaveCount(0);

  await page.goto("/inventory?location=fridge");
  await expect(page.getByRole("link", { name: "Greek yogurt", exact: true })).toBeVisible();

  await page.goto("/shopping");
  await page.getByRole("button", { name: "Remove Bread" }).click();
  await expect(page.getByRole("heading", { name: "Your list is empty" })).toBeVisible();
});
