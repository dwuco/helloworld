import type { InventoryItem } from "./types";
import { expiryState, normalizeName } from "./utils";

export interface RecipeIngredient {
  /** Display text, e.g. "2 cloves garlic". */
  text: string;
  /** Short name used for shopping lists, e.g. "garlic". */
  name: string;
  /** Any of these (normalized) phrases appearing in an inventory item name counts as a match. */
  match: string[];
  /** Salt, pepper, oil, water: assumed owned when the "assume staples" setting is on. */
  staple?: boolean;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  minutes: number;
  servings: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
}

const ing = (text: string, name: string, match: string[] = [name], extra: Partial<RecipeIngredient> = {}): RecipeIngredient => ({
  text,
  name,
  match,
  ...extra,
});
const salt = ing("Salt", "salt", ["salt"], { staple: true });
const pepper = ing("Black pepper", "black pepper", ["black pepper", "peppercorn"], { staple: true });
const oil = ing("1 tbsp oil", "cooking oil", ["oil"], { staple: true });

export const RECIPES: Recipe[] = [
  {
    id: "veggie-omelette",
    title: "Veggie Omelette",
    description: "A quick, protein-packed breakfast that uses up odds and ends of vegetables.",
    minutes: 15,
    servings: 1,
    tags: ["breakfast", "vegetarian", "quick"],
    ingredients: [
      ing("3 eggs", "eggs", ["egg"]),
      ing("1/4 cup shredded cheese", "cheese", ["cheese"]),
      ing("1 handful spinach", "spinach", ["spinach", "kale"]),
      ing("1/4 bell pepper, diced", "bell pepper", ["bell pepper"], { optional: true }),
      ing("1 tbsp butter", "butter", ["butter"]),
      salt,
      pepper,
    ],
    steps: [
      "Whisk the eggs with a pinch of salt and pepper.",
      "Melt butter in a non-stick pan over medium heat and sauté the vegetables for 2 minutes.",
      "Pour in the eggs, tilting the pan to spread them. Cook until nearly set.",
      "Sprinkle cheese over half, fold, and slide onto a plate.",
    ],
  },
  {
    id: "chicken-stir-fry",
    title: "Chicken Stir-Fry",
    description: "Weeknight stir-fry with crisp vegetables and a simple soy-garlic sauce.",
    minutes: 25,
    servings: 3,
    tags: ["dinner", "high-protein"],
    ingredients: [
      ing("1 lb chicken breast, sliced", "chicken breast", ["chicken"]),
      ing("2 cups broccoli florets", "broccoli", ["broccoli"]),
      ing("1 bell pepper, sliced", "bell pepper", ["bell pepper"]),
      ing("2 cloves garlic", "garlic", ["garlic"]),
      ing("3 tbsp soy sauce", "soy sauce", ["soy sauce"]),
      ing("Cooked rice, to serve", "rice", ["rice"]),
      oil,
    ],
    steps: [
      "Heat oil in a large skillet or wok over high heat.",
      "Add chicken and cook 5–6 minutes until browned and cooked through. Remove.",
      "Stir-fry broccoli and pepper for 3 minutes, then add garlic for 30 seconds.",
      "Return the chicken, add soy sauce, toss to coat and serve over rice.",
    ],
  },
  {
    id: "spaghetti-marinara",
    title: "Spaghetti Marinara",
    description: "Pantry-friendly pasta with a garlicky tomato sauce.",
    minutes: 25,
    servings: 4,
    tags: ["dinner", "vegetarian", "pantry"],
    ingredients: [
      ing("1 lb spaghetti", "spaghetti", ["spaghetti", "pasta", "penne"]),
      ing("1 jar (24 oz) marinara or crushed tomatoes", "marinara sauce", ["marinara", "pasta sauce", "tomato sauce", "crushed tomato", "diced tomato"]),
      ing("3 cloves garlic", "garlic", ["garlic"]),
      ing("Parmesan, to serve", "parmesan", ["parmesan"], { optional: true }),
      ing("Fresh basil", "basil", ["basil"], { optional: true }),
      oil,
      salt,
    ],
    steps: [
      "Boil spaghetti in well-salted water until al dente.",
      "Meanwhile warm oil and sliced garlic in a saucepan until fragrant, then add the sauce and simmer 10 minutes.",
      "Toss drained pasta with the sauce. Top with parmesan and basil if you have them.",
    ],
  },
  {
    id: "black-bean-tacos",
    title: "Black Bean Tacos",
    description: "Smoky, cheap and fast vegetarian tacos.",
    minutes: 20,
    servings: 3,
    tags: ["dinner", "vegetarian", "budget"],
    ingredients: [
      ing("1 can black beans, drained", "black beans", ["black bean"]),
      ing("6 tortillas", "tortillas", ["tortilla"]),
      ing("1 tsp cumin", "cumin", ["cumin", "taco seasoning"]),
      ing("1 avocado", "avocado", ["avocado"]),
      ing("1/2 cup salsa", "salsa", ["salsa"]),
      ing("Shredded cheese", "cheese", ["cheese"], { optional: true }),
      ing("1 lime", "lime", ["lime"], { optional: true }),
      salt,
    ],
    steps: [
      "Warm the beans in a pan with cumin, a splash of water and a pinch of salt; mash lightly.",
      "Warm tortillas in a dry skillet.",
      "Fill tortillas with beans, sliced avocado, salsa and cheese. Finish with lime.",
    ],
  },
  {
    id: "greek-yogurt-parfait",
    title: "Yogurt Berry Parfait",
    description: "Five-minute breakfast or snack.",
    minutes: 5,
    servings: 1,
    tags: ["breakfast", "snack", "no-cook", "quick"],
    ingredients: [
      ing("1 cup Greek yogurt", "greek yogurt", ["yogurt"]),
      ing("1/2 cup berries", "berries", ["berry", "strawberry", "blueberry", "raspberry"]),
      ing("1/4 cup granola", "granola", ["granola"]),
      ing("1 tsp honey", "honey", ["honey"], { optional: true }),
    ],
    steps: ["Layer yogurt, berries and granola in a glass.", "Drizzle with honey and serve."],
  },
  {
    id: "salmon-rice-bowl",
    title: "Salmon Rice Bowl",
    description: "Pan-seared salmon over rice with cucumber and avocado.",
    minutes: 25,
    servings: 2,
    tags: ["dinner", "lunch", "high-protein"],
    ingredients: [
      ing("2 salmon fillets", "salmon", ["salmon"]),
      ing("2 cups cooked rice", "rice", ["rice"]),
      ing("1 cucumber", "cucumber", ["cucumber"]),
      ing("1 avocado", "avocado", ["avocado"]),
      ing("2 tbsp soy sauce", "soy sauce", ["soy sauce"]),
      ing("Sesame seeds", "sesame seeds", ["sesame"], { optional: true }),
      oil,
      salt,
    ],
    steps: [
      "Season salmon with salt. Sear skin-side down in hot oil for 4 minutes, flip, cook 3 more.",
      "Divide rice between bowls and top with sliced cucumber, avocado and flaked salmon.",
      "Drizzle with soy sauce and sprinkle sesame seeds.",
    ],
  },
  {
    id: "grilled-cheese-tomato-soup",
    title: "Grilled Cheese & Tomato Soup",
    description: "The classic comfort lunch.",
    minutes: 20,
    servings: 2,
    tags: ["lunch", "vegetarian", "comfort"],
    ingredients: [
      ing("4 slices bread", "bread", ["bread"]),
      ing("4 slices cheddar", "cheddar cheese", ["cheese"]),
      ing("2 tbsp butter", "butter", ["butter"]),
      ing("1 carton tomato soup", "tomato soup", ["tomato soup"]),
    ],
    steps: [
      "Heat the soup in a saucepan.",
      "Butter the outside of the bread, fill with cheese and cook in a skillet over medium heat 3–4 minutes per side.",
      "Slice and serve with the soup.",
    ],
  },
  {
    id: "overnight-oats",
    title: "Overnight Oats",
    description: "Prep tonight, breakfast is ready tomorrow.",
    minutes: 5,
    servings: 1,
    tags: ["breakfast", "make-ahead", "vegetarian"],
    ingredients: [
      ing("1/2 cup rolled oats", "rolled oats", ["oat"]),
      ing("1/2 cup milk", "milk", ["milk"]),
      ing("1/4 cup yogurt", "yogurt", ["yogurt"], { optional: true }),
      ing("1 banana or berries", "banana", ["banana", "berry", "strawberry", "blueberry"]),
      ing("1 tsp honey or maple syrup", "honey", ["honey", "maple syrup", "syrup"], { optional: true }),
    ],
    steps: ["Stir oats, milk and yogurt together in a jar.", "Top with fruit and honey, cover, and refrigerate overnight."],
  },
  {
    id: "beef-chili",
    title: "Weeknight Beef Chili",
    description: "Hearty one-pot chili that freezes well.",
    minutes: 45,
    servings: 6,
    tags: ["dinner", "freezer-friendly", "high-protein"],
    ingredients: [
      ing("1 lb ground beef", "ground beef", ["ground beef", "ground turkey"]),
      ing("1 onion, diced", "onion", ["onion"]),
      ing("2 cans kidney or black beans", "beans", ["kidney bean", "black bean", "pinto bean"]),
      ing("1 can diced tomatoes", "diced tomatoes", ["diced tomato", "crushed tomato", "tomato sauce"]),
      ing("2 tbsp chili powder", "chili powder", ["chili powder"]),
      ing("1 tsp cumin", "cumin", ["cumin"]),
      ing("Shredded cheese, to serve", "cheese", ["cheese"], { optional: true }),
      oil,
      salt,
    ],
    steps: [
      "Brown beef and onion in oil in a large pot, 8 minutes.",
      "Stir in spices for 1 minute.",
      "Add tomatoes and drained beans, simmer 25 minutes, season with salt.",
      "Serve topped with cheese. Cool leftovers and freeze in portions.",
    ],
  },
  {
    id: "caprese-salad",
    title: "Caprese Salad",
    description: "Tomatoes, mozzarella and basil — best when tomatoes are ripe.",
    minutes: 10,
    servings: 2,
    tags: ["lunch", "vegetarian", "no-cook"],
    ingredients: [
      ing("2 large tomatoes", "tomatoes", ["tomato"]),
      ing("8 oz fresh mozzarella", "mozzarella", ["mozzarella"]),
      ing("Handful of basil", "basil", ["basil"]),
      ing("Balsamic vinegar", "balsamic vinegar", ["balsamic", "vinegar"], { optional: true }),
      oil,
      salt,
    ],
    steps: ["Slice tomatoes and mozzarella.", "Alternate on a plate with basil leaves.", "Drizzle with oil and balsamic; season with salt."],
  },
  {
    id: "fried-rice",
    title: "Leftover Fried Rice",
    description: "The best use for day-old rice and stray vegetables.",
    minutes: 20,
    servings: 2,
    tags: ["dinner", "lunch", "use-it-up"],
    ingredients: [
      ing("3 cups cooked rice (day-old is best)", "rice", ["rice"]),
      ing("2 eggs", "eggs", ["egg"]),
      ing("1 cup frozen peas & carrots", "frozen peas and carrots", ["pea", "carrot", "mixed vegetable"]),
      ing("2 green onions", "green onions", ["green onion", "scallion"], { optional: true }),
      ing("2 tbsp soy sauce", "soy sauce", ["soy sauce"]),
      oil,
    ],
    steps: [
      "Scramble the eggs in oil in a hot wok; remove.",
      "Add vegetables and cook 2 minutes, then the rice, pressing to crisp it.",
      "Return eggs, add soy sauce and green onions, toss and serve.",
    ],
  },
  {
    id: "banana-pancakes",
    title: "Banana Pancakes",
    description: "Fluffy pancakes that rescue overripe bananas.",
    minutes: 25,
    servings: 3,
    tags: ["breakfast", "vegetarian", "use-it-up"],
    ingredients: [
      ing("2 ripe bananas", "bananas", ["banana"]),
      ing("1 cup flour", "flour", ["flour", "pancake mix"]),
      ing("1 egg", "egg", ["egg"]),
      ing("3/4 cup milk", "milk", ["milk"]),
      ing("1 tsp baking powder", "baking powder", ["baking powder", "pancake mix"]),
      ing("Butter for the pan", "butter", ["butter"]),
      ing("Maple syrup", "maple syrup", ["syrup", "honey"], { optional: true }),
    ],
    steps: [
      "Mash bananas, then whisk in egg and milk.",
      "Stir in flour and baking powder until just combined.",
      "Cook 1/4-cup portions in a buttered pan over medium heat, 2 minutes per side.",
    ],
  },
  {
    id: "chicken-quesadilla",
    title: "Chicken Quesadillas",
    description: "Crispy quesadillas using leftover or rotisserie chicken.",
    minutes: 15,
    servings: 2,
    tags: ["lunch", "dinner", "quick", "use-it-up"],
    ingredients: [
      ing("1 1/2 cups cooked chicken", "cooked chicken", ["chicken"]),
      ing("4 tortillas", "tortillas", ["tortilla"]),
      ing("1 cup shredded cheese", "cheese", ["cheese"]),
      ing("Salsa", "salsa", ["salsa"], { optional: true }),
      ing("Sour cream", "sour cream", ["sour cream"], { optional: true }),
    ],
    steps: [
      "Fill half of each tortilla with chicken and cheese, then fold.",
      "Cook in a dry skillet over medium heat 2–3 minutes per side until golden and melted.",
      "Cut into wedges and serve with salsa and sour cream.",
    ],
  },
  {
    id: "tuna-salad-sandwich",
    title: "Tuna Salad Sandwich",
    description: "A pantry lunch in five minutes.",
    minutes: 10,
    servings: 2,
    tags: ["lunch", "no-cook", "pantry", "quick"],
    ingredients: [
      ing("1 can tuna", "canned tuna", ["tuna"]),
      ing("2 tbsp mayonnaise", "mayonnaise", ["mayo", "mayonnaise"]),
      ing("1 celery stalk", "celery", ["celery"], { optional: true }),
      ing("4 slices bread", "bread", ["bread"]),
      ing("Lettuce", "lettuce", ["lettuce", "spinach"], { optional: true }),
      salt,
      pepper,
    ],
    steps: ["Mix drained tuna with mayo, chopped celery, salt and pepper.", "Spread on bread with lettuce and serve."],
  },
  {
    id: "roasted-veg-sheet-pan",
    title: "Sheet-Pan Roasted Vegetables",
    description: "Roast whatever vegetables need using up.",
    minutes: 35,
    servings: 4,
    tags: ["side", "vegetarian", "vegan", "use-it-up"],
    ingredients: [
      ing("2 cups broccoli or cauliflower", "broccoli", ["broccoli", "cauliflower"]),
      ing("2 carrots", "carrots", ["carrot"]),
      ing("1 bell pepper or zucchini", "bell pepper", ["bell pepper", "zucchini"]),
      ing("1 onion", "onion", ["onion"], { optional: true }),
      oil,
      salt,
      pepper,
    ],
    steps: [
      "Heat oven to 425°F (220°C).",
      "Cut vegetables into even pieces, toss with oil, salt and pepper.",
      "Roast on a sheet pan 25 minutes, tossing halfway.",
    ],
  },
  {
    id: "egg-fried-potatoes",
    title: "Breakfast Potato Hash",
    description: "Crispy potatoes, onions and eggs in one skillet.",
    minutes: 30,
    servings: 2,
    tags: ["breakfast", "vegetarian"],
    ingredients: [
      ing("2 potatoes, diced", "potatoes", ["potato"]),
      ing("1 onion", "onion", ["onion"]),
      ing("4 eggs", "eggs", ["egg"]),
      ing("Bacon or sausage", "bacon", ["bacon", "sausage"], { optional: true }),
      oil,
      salt,
      pepper,
    ],
    steps: [
      "Cook potatoes in oil over medium-high heat, 12 minutes, until browned.",
      "Add onion (and bacon) and cook 5 more minutes.",
      "Make wells, crack in eggs, cover and cook until set. Season and serve.",
    ],
  },
  {
    id: "pb-banana-smoothie",
    title: "Peanut Butter Banana Smoothie",
    description: "Filling, blender-only breakfast.",
    minutes: 5,
    servings: 1,
    tags: ["breakfast", "snack", "no-cook", "quick"],
    ingredients: [
      ing("1 banana (frozen is great)", "banana", ["banana"]),
      ing("1 cup milk", "milk", ["milk"]),
      ing("1 tbsp peanut butter", "peanut butter", ["peanut butter"]),
      ing("1/4 cup oats", "oats", ["oat"], { optional: true }),
    ],
    steps: ["Blend everything until smooth."],
  },
  {
    id: "lemon-garlic-shrimp-pasta",
    title: "Lemon Garlic Shrimp Pasta",
    description: "Bright, buttery pasta ready in 20 minutes.",
    minutes: 20,
    servings: 3,
    tags: ["dinner", "seafood"],
    ingredients: [
      ing("1 lb shrimp", "shrimp", ["shrimp"]),
      ing("8 oz pasta", "pasta", ["pasta", "spaghetti", "linguine", "penne"]),
      ing("4 cloves garlic", "garlic", ["garlic"]),
      ing("1 lemon", "lemon", ["lemon"]),
      ing("3 tbsp butter", "butter", ["butter"]),
      ing("Parsley", "parsley", ["parsley"], { optional: true }),
      salt,
    ],
    steps: [
      "Cook pasta in salted water; reserve 1/2 cup cooking water.",
      "Melt butter, cook garlic 1 minute, add shrimp and cook 2 minutes per side.",
      "Toss in pasta, lemon juice and zest, and a splash of pasta water. Top with parsley.",
    ],
  },
];

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export interface IngredientMatch {
  ingredient: RecipeIngredient;
  owned: boolean;
  /** The inventory item that satisfied this ingredient, if any. */
  item: InventoryItem | null;
  assumedStaple: boolean;
}

export interface RecipeMatch {
  recipe: Recipe;
  ingredients: IngredientMatch[];
  requiredCount: number;
  ownedRequiredCount: number;
  missing: RecipeIngredient[];
  /** 0–100, share of required ingredients owned. */
  score: number;
  /** Number of matched inventory items that are expiring soon or already expired. */
  usesExpiring: number;
}

function containsPhrase(haystack: string, phrase: string): boolean {
  return ` ${haystack} `.includes(` ${phrase} `);
}

export function findItemFor(ingredient: RecipeIngredient, inventory: InventoryItem[]): InventoryItem | null {
  const phrases = ingredient.match.map(normalizeName);
  // Prefer the item that expires soonest so recipes help use food up.
  const candidates = inventory
    .filter((item) => item.quantity > 0)
    .filter((item) => {
      const n = normalizeName(item.name);
      return phrases.some((p) => containsPhrase(n, p));
    })
    .sort((a, b) => (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999"));
  return candidates[0] ?? null;
}

export function matchRecipe(
  recipe: Recipe,
  inventory: InventoryItem[],
  opts: { assumeStaples: boolean; expiringSoonDays: number },
): RecipeMatch {
  const ingredients: IngredientMatch[] = recipe.ingredients.map((ingredient) => {
    const item = findItemFor(ingredient, inventory);
    const assumedStaple = !item && !!ingredient.staple && opts.assumeStaples;
    return { ingredient, item, owned: !!item || assumedStaple, assumedStaple };
  });
  const required = ingredients.filter((i) => !i.ingredient.optional);
  const ownedRequired = required.filter((i) => i.owned);
  const usesExpiring = ingredients.filter((i) => {
    if (!i.item) return false;
    const s = expiryState(i.item.expiresOn, opts.expiringSoonDays);
    return s === "soon" || s === "expired";
  }).length;
  return {
    recipe,
    ingredients,
    requiredCount: required.length,
    ownedRequiredCount: ownedRequired.length,
    missing: required.filter((i) => !i.owned).map((i) => i.ingredient),
    score: required.length === 0 ? 100 : Math.round((ownedRequired.length / required.length) * 100),
    usesExpiring,
  };
}

/** Rank recipes: fewest missing first, then those that use expiring food, then faster ones. */
export function rankRecipes(
  inventory: InventoryItem[],
  opts: { assumeStaples: boolean; expiringSoonDays: number },
  recipes: Recipe[] = RECIPES,
): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, inventory, opts))
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.usesExpiring - a.usesExpiring ||
        b.score - a.score ||
        a.recipe.minutes - b.recipe.minutes,
    );
}
