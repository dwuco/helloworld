import { describe, expect, it } from "vitest";
import { addDays, classifyFood, daysBetween, describeExpiry, expiryState, normalizeName, startOfWeek } from "@/lib/utils";

describe("dates", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("computes days between", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
  });
  it("finds Monday", () => {
    expect(startOfWeek("2026-10-30")).toBe("2026-10-26"); // Friday -> Monday
    expect(startOfWeek("2026-10-26")).toBe("2026-10-26");
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26"); // Sunday
  });
  it("labels expiry", () => {
    const today = "2026-10-30";
    expect(expiryState(null, 3, today)).toBe("none");
    expect(expiryState("2026-10-29", 3, today)).toBe("expired");
    expect(expiryState("2026-11-02", 3, today)).toBe("soon");
    expect(expiryState("2026-11-10", 3, today)).toBe("ok");
    expect(describeExpiry("2026-10-30", today)).toBe("Expires today");
    expect(describeExpiry("2026-10-27", today)).toBe("Expired 3 days ago");
  });
});

describe("normalizeName", () => {
  it("handles plurals and punctuation", () => {
    expect(normalizeName("Tomatoes")).toBe("tomato");
    expect(normalizeName("Strawberries!")).toBe("strawberry");
    expect(normalizeName("  Black   Beans ")).toBe("black bean");
    expect(normalizeName("Swiss")).toBe("swiss");
  });
});

describe("classifyFood", () => {
  it.each([
    ["Ground cinnamon", "spices"],
    ["Ground beef", "meat"],
    ["Popcorn", "snacks"],
    ["Chicken broth", "canned"],
    ["Orange juice", "beverages"],
    ["Ice cream", "frozen"],
    ["Rolled oats", "grains"],
    ["Mystery item", "other"],
  ])("%s -> %s", (name, category) => {
    expect(classifyFood(name).category).toBe(category);
  });
});
