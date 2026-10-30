import { describe, expect, it } from "vitest";
import { extractEmailText, parseReceipt, parseReceiptLine } from "@/lib/receipt-parser";

describe("parseReceiptLine", () => {
  it.each([
    ["2 x Bananas $1.24", "Bananas", 2, "count", 1.24],
    ["Great Value Whole Milk, 1 gal Qty 2 $6.48", "Great Value Whole Milk, 1 gal", 2, "count", 6.48],
    ["BANANAS 000000004011 F 1.24", "Bananas", 1, "count", 1.24],
    ["Eggs, 18 ct - Qty: 1 - $3.99", "Eggs, 18 ct", 1, "count", 3.99],
    ["Chicken Breast 2.31 lb @ 3.99/lb 9.22", "Chicken Breast", 2.31, "lb", 9.22],
    ["3 Avocados", "Avocados", 3, "count", null],
    ["2 lb ground beef 11.98", "ground beef", 2, "lb", 11.98],
    ["Kirkland Signature Organic Eggs 24 ct $8.99", "Kirkland Signature Organic Eggs 24 ct", 1, "count", 8.99],
    ["Strawberries x 2", "Strawberries", 2, "count", null],
  ])("parses %s", (raw, name, qty, unit, price) => {
    const line = parseReceiptLine(raw);
    expect(line).not.toBeNull();
    expect(line!.name).toBe(name);
    expect(line!.quantity).toBe(qty);
    expect(line!.unit).toBe(unit);
    expect(line!.price).toBe(price);
    expect(line!.include).toBe(true);
  });

  it.each(["SUBTOTAL 45.12", "TAX 2.10", "TOTAL $47.22", "VISA **** 1234", "Order # 2000123-4567", "Thank you for shopping!", "Springfield, IL 62701", "Coupon -1.00", "Delivery fee 7.95", "12/04/2026 10:31 AM", "Item Qty Price", "Walmart pickup order", "WALMART SUPERCENTER", "Costco Wholesale #123", "Order summary"])(
    "skips non-item line %s",
    (raw) => {
      expect(parseReceiptLine(raw)).toBeNull();
    },
  );

  it("classifies location and category", () => {
    expect(parseReceiptLine("Frozen Peas 1.99")).toMatchObject({ location: "freezer", category: "frozen" });
    expect(parseReceiptLine("Whole Milk 3.49")).toMatchObject({ location: "fridge", category: "dairy" });
    expect(parseReceiptLine("Spaghetti 1.29")).toMatchObject({ location: "pantry", category: "grains" });
    expect(parseReceiptLine("Peanut Butter 2.99")).toMatchObject({ category: "condiments" });
    expect(parseReceiptLine("Salted Butter 4.99")).toMatchObject({ category: "dairy" });
  });
});

describe("parseReceipt", () => {
  it("parses a pickup order confirmation and detects order details", () => {
    const text = `Your pickup order is ready
Order #200012345678
Great Value Large White Eggs, 18 ct  Qty 1  $3.84
Bananas, each  Qty 6  $1.50
Marketside Baby Spinach 5 oz  Qty 1  $2.48
Subtotal $7.82
Tax $0.00
Total $7.82`;
    const r = parseReceipt(text);
    expect(r.lines.map((l) => l.name)).toEqual(["Great Value Large White Eggs, 18 ct", "Bananas, each", "Marketside Baby Spinach 5 oz"]);
    expect(r.lines[1]!.quantity).toBe(6);
    expect(r.orderRef).toBe("200012345678");
    expect(r.detectedFulfillment).toBe("pickup");
    expect(r.skipped.length).toBeGreaterThan(0);
  });

  it("parses CSV with a header row", () => {
    const r = parseReceipt('Item,Quantity,Unit,Price\n"Milk, whole",2,bottle,6.98\nApples,6,,4.50\n');
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toMatchObject({ name: "Milk, whole", quantity: 2, unit: "bottle", price: 6.98 });
    expect(r.lines[1]).toMatchObject({ name: "Apples", quantity: 6, unit: "count" });
  });

  it("returns no lines for empty input", () => {
    expect(parseReceipt("   \n  ").lines).toEqual([]);
  });
});

describe("extractEmailText", () => {
  it("prefers the text/plain part and decodes quoted-printable", () => {
    const eml = [
      "From: orders@example.com",
      'Content-Type: multipart/alternative; boundary="b1"',
      "",
      "--b1",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "2 x Avocados $3.=",
      "98",
      "--b1",
      "Content-Type: text/html",
      "",
      "<p>ignored</p>",
      "--b1--",
    ].join("\r\n");
    expect(extractEmailText(eml)).toBe("2 x Avocados $3.98");
  });

  it("strips HTML when only an HTML part exists", () => {
    const eml = 'Content-Type: multipart/alternative; boundary="x"\n\n--x\nContent-Type: text/html\n\n<table><tr><td>Milk</td><td>&#36;3.49</td></tr></table>\n--x--';
    expect(extractEmailText(eml)).toContain("Milk $3.49");
  });
});
