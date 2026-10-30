import { CATEGORIES, LOCATIONS, MEAL_SLOTS, UNITS } from "./types";
import type { InventoryInput, MealPlanInput, ShoppingInput } from "./types";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateInventory(input: InventoryInput): FieldErrors<InventoryInput> {
  const errors: FieldErrors<InventoryInput> = {};
  if (!input.name.trim()) errors.name = "Enter a name.";
  else if (input.name.length > 120) errors.name = "Keep the name under 120 characters.";
  if (!Number.isFinite(input.quantity) || input.quantity < 0) errors.quantity = "Quantity must be 0 or more.";
  else if (input.quantity > 100000) errors.quantity = "That quantity looks too large.";
  if (!UNITS.includes(input.unit)) errors.unit = "Choose a unit.";
  if (!LOCATIONS.includes(input.location)) errors.location = "Choose fridge, freezer or pantry.";
  if (!CATEGORIES.includes(input.category)) errors.category = "Choose a category.";
  if (input.expiresOn && !DATE_RE.test(input.expiresOn)) errors.expiresOn = "Use a valid date.";
  if (input.lowStockThreshold != null && (!Number.isFinite(input.lowStockThreshold) || input.lowStockThreshold < 0))
    errors.lowStockThreshold = "Must be 0 or more.";
  if (input.notes.length > 500) errors.notes = "Keep notes under 500 characters.";
  return errors;
}

export function validateShopping(input: ShoppingInput): FieldErrors<ShoppingInput> {
  const errors: FieldErrors<ShoppingInput> = {};
  if (!input.name.trim()) errors.name = "Enter an item name.";
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) errors.quantity = "Quantity must be more than 0.";
  if (!UNITS.includes(input.unit)) errors.unit = "Choose a unit.";
  return errors;
}

export function validateMeal(input: MealPlanInput): FieldErrors<MealPlanInput> {
  const errors: FieldErrors<MealPlanInput> = {};
  if (!input.title.trim()) errors.title = "Choose a recipe or enter a meal.";
  if (!DATE_RE.test(input.date)) errors.date = "Choose a date.";
  if (!MEAL_SLOTS.includes(input.slot)) errors.slot = "Choose a meal slot.";
  if (!Number.isFinite(input.servings) || input.servings < 1) errors.servings = "At least 1 serving.";
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}

export class ValidationError extends Error {
  constructor(public readonly fields: Record<string, string | undefined>) {
    super(Object.values(fields).filter(Boolean).join(" "));
    this.name = "ValidationError";
  }
}

export function assertValid(errors: object): void {
  if (hasErrors(errors)) throw new ValidationError(errors as Record<string, string | undefined>);
}
