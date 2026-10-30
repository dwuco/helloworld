import { expect, test } from "@playwright/test";
import { startEmpty } from "./helpers";

test("pickup order waits for confirmation, then lands in inventory", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/import");
  await page.getByRole("button", { name: "Fill in an example receipt" }).click();
  // Retailer and pickup are detected from the text
  await expect(page.getByLabel("Store", { exact: true })).toHaveValue("walmart");
  await expect(page.getByRole("radio", { name: "Pickup" })).toBeChecked();
  await page.getByRole("button", { name: "Review items" }).click();

  await expect(page.getByRole("heading", { name: "Review items" })).toBeVisible();
  await expect(page.getByText("5 of 5 selected")).toBeVisible();
  // Exclude one line (out of stock)
  await page.getByRole("checkbox", { name: /Include Bananas/ }).uncheck();
  await page.getByRole("button", { name: /Save — waiting for pickup/ }).click();
  await expect(page.getByText(/Confirm when your pickup arrives/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confirm pickup" })).toBeVisible();

  // Nothing in inventory yet; dashboard prompts for confirmation
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Confirm picked up" })).toBeVisible();
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: "Your kitchen is empty" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Confirm picked up" }).click();
  await page.getByRole("button", { name: /Picked up — add 4 items/ }).click();
  await expect(page).toHaveURL("/inventory");
  await expect(page.getByText(/Added 4 new/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Great Value Large White Eggs, 18 ct", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bananas/ })).toHaveCount(0);

  await page.goto("/import");
  await expect(page.getByText("Added to inventory")).toBeVisible();
});

test("in-store receipt goes straight to inventory and merges duplicates", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/import");
  await page.getByLabel("Receipt or order text").fill("2 x Avocados 3.98\nTOTAL 3.98");
  await page.getByRole("radio", { name: "In store" }).check({ force: true });
  await page.getByRole("button", { name: "Review items" }).click();
  await page.getByRole("button", { name: "Add 1 item to inventory" }).click();
  await expect(page).toHaveURL("/inventory");

  await page.goto("/import");
  await page.getByLabel("Receipt or order text").fill("3 Avocados");
  await page.getByRole("radio", { name: "In store" }).check({ force: true });
  await page.getByRole("button", { name: "Review items" }).click();
  await page.getByRole("button", { name: "Add 1 item to inventory" }).click();
  await expect(page.getByText(/updated 1 existing/)).toBeVisible();
  await expect(page.getByLabel("Quantity 5")).toBeVisible();
});

test("shows a helpful error when no items are found, and rejects photos", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/import");
  await page.getByRole("button", { name: "Review items" }).click();
  await expect(page.getByText("Paste or type at least one item.")).toBeVisible();
  await page.getByLabel("Receipt or order text").fill("SUBTOTAL 4.00\nTAX 0.30\nTOTAL 4.30");
  await page.getByRole("button", { name: "Review items" }).click();
  await expect(page.getByText(/couldn't find any grocery items/)).toBeVisible();

  await page.getByRole("tab", { name: "Upload file" }).click();
  await page.locator("#receipt-file").setInputFiles({ name: "receipt.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8]) });
  await expect(page.getByText(/Photos and PDFs can't be read yet/)).toBeVisible();
});

test("imports an order confirmation saved as .eml", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/import");
  await page.getByRole("tab", { name: "Upload file" }).click();
  const eml = ["From: Costco <orders@costco.com>", "Subject: Your delivery", "Content-Type: text/plain", "", "Kirkland Signature Organic Eggs 24 ct $8.99", "Bananas 3 lb 1.49", "Total 10.48"].join("\r\n");
  await page.locator("#receipt-file").setInputFiles({ name: "order.eml", mimeType: "message/rfc822", buffer: Buffer.from(eml) });
  await expect(page.getByText("Loaded order.eml.")).toBeVisible();
  await expect(page.getByLabel("Store", { exact: true })).toHaveValue("costco");
  await page.getByRole("button", { name: "Review items" }).click();
  await expect(page.getByText("2 of 2 selected")).toBeVisible();
});

test("an awaiting order can be cancelled without touching inventory", async ({ page }) => {
  await startEmpty(page);
  await page.goto("/import");
  await page.getByLabel("Receipt or order text").fill("Milk 3.49");
  await page.getByRole("radio", { name: "Delivery" }).check({ force: true });
  await page.getByRole("button", { name: "Review items" }).click();
  await page.getByRole("button", { name: /Save — waiting for delivery/ }).click();
  await page.getByRole("button", { name: "Cancel order" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel order" }).click();
  await expect(page).toHaveURL("/import");
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: "Your kitchen is empty" })).toBeVisible();
});
