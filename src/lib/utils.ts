import type { FoodCategory, StorageLocation, Unit } from "./types";
import { UNITS } from "./types";

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). Negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const ms = parseDateKey(to).getTime() - parseDateKey(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: string): string {
  const date = parseDateKey(key);
  const offset = (date.getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function formatDate(key: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return parseDateKey(key).toLocaleDateString(undefined, opts);
}

export type ExpiryState = "expired" | "soon" | "ok" | "none";

export function expiryState(expiresOn: string | null, soonDays: number, today = todayKey()): ExpiryState {
  if (!expiresOn) return "none";
  const diff = daysBetween(today, expiresOn);
  if (diff < 0) return "expired";
  if (diff <= soonDays) return "soon";
  return "ok";
}

export function describeExpiry(expiresOn: string | null, today = todayKey()): string {
  if (!expiresOn) return "No expiry date";
  const diff = daysBetween(today, expiresOn);
  if (diff < -1) return `Expired ${-diff} days ago`;
  if (diff === -1) return "Expired yesterday";
  if (diff === 0) return "Expires today";
  if (diff === 1) return "Expires tomorrow";
  return `Expires in ${diff} days`;
}

export function formatQuantity(quantity: number, unit: Unit): string {
  const q = Number.isInteger(quantity) ? String(quantity) : String(Math.round(quantity * 100) / 100);
  return unit === "count" ? q : `${q} ${unit}`;
}

/** Lowercase, trim, collapse whitespace and drop a trailing plural "s"/"es". */
export function normalizeName(name: string): string {
  let n = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  n = n
    .split(" ")
    .map((word) => {
      if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
      if (word.length > 4 && /(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
      if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
      return word;
    })
    .join(" ");
  return n;
}

const UNIT_ALIASES: Record<string, Unit> = {
  ct: "count", ea: "count", each: "count", pc: "count", pcs: "count", x: "count",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  oz: "oz", ounce: "oz", ounces: "oz",
  g: "g", gram: "g", grams: "g",
  kg: "kg", kgs: "kg",
  ml: "ml", l: "l", liter: "l", litre: "l", liters: "l",
  cup: "cup", cups: "cup",
  pk: "pack", pack: "pack", packs: "pack", pkg: "pack",
  can: "can", cans: "can",
  jar: "jar", jars: "jar",
  btl: "bottle", bottle: "bottle", bottles: "bottle",
  box: "box", boxes: "box",
  bag: "bag", bags: "bag",
  dz: "dozen", doz: "dozen", dozen: "dozen",
  gal: "bottle", gallon: "bottle",
};

export function parseUnit(token: string | undefined): Unit | null {
  if (!token) return null;
  const t = token.toLowerCase().replace(/\.$/, "");
  if ((UNITS as readonly string[]).includes(t)) return t as Unit;
  return UNIT_ALIASES[t] ?? null;
}

interface Rule {
  keywords: string[];
  category: FoodCategory;
  location: StorageLocation;
  shelfDays: number | null;
}

// Ordered: first match wins. Keywords match whole words (an optional plural
// "s"/"es" is allowed), so "salted butter" is not a spice and "popcorn" is not corn.
const RULES: Rule[] = [
  { keywords: ["frozen", "ice cream", "popsicle"], category: "frozen", location: "freezer", shelfDays: 180 },
  { keywords: ["peanut butter", "almond butter", "soy sauce", "hot sauce", "pasta sauce", "bbq sauce"], category: "condiments", location: "pantry", shelfDays: 365 },
  { keywords: ["canned", "tomato sauce", "diced tomato", "tomato paste", "broth", "stock", "soup"], category: "canned", location: "pantry", shelfDays: 730 },
  { keywords: ["black pepper", "chili powder", "garlic powder", "onion powder"], category: "spices", location: "pantry", shelfDays: 730 },
  { keywords: ["juice", "soda", "sparkling water", "coffee", "tea", "kombucha"], category: "beverages", location: "pantry", shelfDays: 365 },
  { keywords: ["tuna steak", "salmon", "shrimp", "cod", "tilapia", "fish"], category: "seafood", location: "fridge", shelfDays: 2 },
  { keywords: ["milk", "yogurt", "cheese", "butter", "cream", "egg", "sour cream", "cottage cheese", "half and half"], category: "dairy", location: "fridge", shelfDays: 10 },
  { keywords: ["salt", "cumin", "paprika", "oregano", "cinnamon", "seasoning", "spice", "sugar", "baking soda", "baking powder", "vanilla"], category: "spices", location: "pantry", shelfDays: 730 },
  { keywords: ["chicken", "beef", "pork", "turkey", "bacon", "sausage", "ham", "steak", "ground beef", "ground turkey"], category: "meat", location: "fridge", shelfDays: 3 },
  { keywords: ["lettuce", "spinach", "kale", "tomato", "cucumber", "bell pepper", "pepper", "carrot", "broccoli", "celery", "berry", "berries", "strawberry", "strawberries", "blueberries", "grape", "apple", "banana", "orange", "lemon", "lime", "avocado", "onion", "garlic", "potato", "potatoes", "zucchini", "mushroom", "cilantro", "parsley", "basil", "scallion", "green onion", "salad", "fruit", "vegetable", "ginger", "jalapeno"], category: "produce", location: "fridge", shelfDays: 7 },
  { keywords: ["bread", "bagel", "tortilla", "bun", "muffin", "croissant", "roll"], category: "bakery", location: "pantry", shelfDays: 7 },
  { keywords: ["rice", "pasta", "spaghetti", "penne", "noodle", "oat", "oatmeal", "flour", "quinoa", "cereal", "couscous"], category: "grains", location: "pantry", shelfDays: 365 },
  { keywords: ["bean", "tuna", "chickpea", "corn"], category: "canned", location: "pantry", shelfDays: 730 },
  { keywords: ["ketchup", "mustard", "mayo", "mayonnaise", "vinegar", "oil", "dressing", "salsa", "honey", "syrup", "jam", "sauce"], category: "condiments", location: "pantry", shelfDays: 365 },
  { keywords: ["chip", "cracker", "cookie", "pretzel", "popcorn", "nut", "almond", "granola", "granola bar"], category: "snacks", location: "pantry", shelfDays: 120 },
  { keywords: ["water"], category: "beverages", location: "pantry", shelfDays: 365 },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const RULE_PATTERNS = RULES.map((rule) => ({
  rule,
  patterns: rule.keywords.map((k) => new RegExp(`\\b${escapeRegExp(k)}(s|es)?\\b`, "i")),
}));

export interface Classification {
  category: FoodCategory;
  location: StorageLocation;
  /** Suggested shelf life in days, or null if unknown. A suggestion only; users can edit it. */
  shelfDays: number | null;
}

export function classifyFood(name: string): Classification {
  for (const { rule, patterns } of RULE_PATTERNS) {
    if (patterns.some((p) => p.test(name))) {
      return { category: rule.category, location: rule.location, shelfDays: rule.shelfDays };
    }
  }
  return { category: "other", location: "pantry", shelfDays: null };
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** "1 item", "3 items". */
export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count} ${count === 1 ? word : pluralWord}`;
}
