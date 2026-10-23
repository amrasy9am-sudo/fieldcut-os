import type { Sen } from "./money.ts";

export type IngredientId =
  | "chicken" | "salmon" | "egg" | "lettuce" | "cabbage" | "cucumber" | "carrot"
  | "tomato" | "corn" | "edamame" | "onion" | "lemon" | "brown_rice";

export type Ingredient = {
  id: IngredientId;
  name: string;
  unit: "g" | "pc";
  /** Cost per kg for grams, per piece for pieces. */
  costSen: Sen;
  station: "Grill" | "Oven" | "Hob" | "Wash & cut" | "Cold";
};

export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  chicken: { id: "chicken", name: "Chicken breast fillet", unit: "g", costSen: 1600, station: "Grill" },
  salmon: { id: "salmon", name: "Salmon fillet", unit: "g", costSen: 6200, station: "Oven" },
  egg: { id: "egg", name: "Eggs (grade A)", unit: "pc", costSen: 50, station: "Hob" },
  lettuce: { id: "lettuce", name: "Romaine / iceberg lettuce", unit: "g", costSen: 1200, station: "Wash & cut" },
  cabbage: { id: "cabbage", name: "Purple cabbage", unit: "g", costSen: 700, station: "Wash & cut" },
  cucumber: { id: "cucumber", name: "Japanese cucumber", unit: "g", costSen: 450, station: "Wash & cut" },
  carrot: { id: "carrot", name: "Carrot", unit: "g", costSen: 400, station: "Wash & cut" },
  tomato: { id: "tomato", name: "Cherry tomato", unit: "g", costSen: 1400, station: "Wash & cut" },
  corn: { id: "corn", name: "Sweet corn", unit: "g", costSen: 1000, station: "Wash & cut" },
  edamame: { id: "edamame", name: "Edamame", unit: "g", costSen: 2200, station: "Hob" },
  onion: { id: "onion", name: "Red onion", unit: "g", costSen: 600, station: "Wash & cut" },
  lemon: { id: "lemon", name: "Lemon", unit: "pc", costSen: 90, station: "Cold" },
  brown_rice: { id: "brown_rice", name: "Brown rice (raw)", unit: "g", costSen: 800, station: "Hob" },
};

export type BomLine = { ingredient: IngredientId; qty: number };

/** The 235 g rainbow base every bowl shares. */
export const BASE_BOM: BomLine[] = [
  { ingredient: "lettuce", qty: 80 },
  { ingredient: "cabbage", qty: 25 },
  { ingredient: "cucumber", qty: 50 },
  { ingredient: "carrot", qty: 30 },
  { ingredient: "tomato", qty: 30 },
  { ingredient: "corn", qty: 20 },
];

export type DressingCode = "HM" | "RS" | "LY";

export type Dressing = { code: DressingCode; name: string; kcal: number; cupCostSen: Sen; color: string };

export const DRESSINGS: Record<DressingCode, Dressing> = {
  HM: { code: "HM", name: "Honey Mustard", kcal: 105, cupCostSen: 82, color: "#F29E4C" },
  RS: { code: "RS", name: "Roasted Sesame", kcal: 95, cupCostSen: 60, color: "#8A5A2B" },
  LY: { code: "LY", name: "Lemon Herb Yogurt", kcal: 55, cupCostSen: 57, color: "#2E5B3B" },
};

export type ProteinKind = "chicken" | "teriyaki" | "salmon" | "egg";

export type BowlSlug = "field-classic" | "sesame-teriyaki" | "harbour-salmon" | "garden-two-egg";

export type Bowl = {
  slug: BowlSlug;
  name: string;
  shortName: string;
  tag: string;
  description: string;
  /** Default list price. The live price can be changed in the console. */
  priceSen: Sen;
  /** Estimated, including the default dressing. */
  kcal: number;
  proteinG: number;
  dressing: DressingCode;
  allergens: string[];
  protein: ProteinKind;
  toppings: BomLine[];
  marinadeSen: Sen;
};

export const BOWLS: Bowl[] = [
  {
    slug: "field-classic",
    name: "The Field Classic",
    shortName: "Field Classic",
    tag: "Bestseller",
    description: "Paprika-garlic grilled chicken breast, soft-boiled egg and the full rainbow base.",
    priceSen: 1590,
    kcal: 430,
    proteinG: 38,
    dressing: "HM",
    allergens: ["egg", "mustard"],
    protein: "chicken",
    toppings: [{ ingredient: "chicken", qty: 130 }, { ingredient: "egg", qty: 1 }],
    marinadeSen: 35,
  },
  {
    slug: "sesame-teriyaki",
    name: "The Sesame Teriyaki",
    shortName: "Sesame Teriyaki",
    tag: "Signature",
    description: "Pan-seared chicken glazed in honey-soy, toasted sesame, spring onion and egg.",
    priceSen: 1690,
    kcal: 480,
    proteinG: 37,
    dressing: "RS",
    allergens: ["egg", "soy", "sesame"],
    protein: "teriyaki",
    toppings: [{ ingredient: "chicken", qty: 130 }, { ingredient: "egg", qty: 1 }],
    marinadeSen: 55,
  },
  {
    slug: "harbour-salmon",
    name: "The Harbour Salmon",
    shortName: "Harbour Salmon",
    tag: "Premium",
    description: "Oven-baked salmon fillet, lemon pepper, red onion, lemon wedge and egg.",
    priceSen: 2690,
    kcal: 520,
    proteinG: 33,
    dressing: "LY",
    allergens: ["fish", "egg", "milk"],
    protein: "salmon",
    toppings: [
      { ingredient: "salmon", qty: 120 },
      { ingredient: "egg", qty: 1 },
      { ingredient: "onion", qty: 15 },
      { ingredient: "lemon", qty: 0.25 },
    ],
    marinadeSen: 40,
  },
  {
    slug: "garden-two-egg",
    name: "The Garden Two-Egg",
    shortName: "Garden Two-Egg",
    tag: "Meat-free",
    description: "Two eggs, edamame and the full rainbow base. Light, filling, meat-free.",
    priceSen: 1190,
    kcal: 340,
    proteinG: 21,
    dressing: "LY",
    allergens: ["egg", "soy", "milk"],
    protein: "egg",
    toppings: [{ ingredient: "egg", qty: 2 }, { ingredient: "edamame", qty: 40 }],
    marinadeSen: 15,
  },
];

export type AddOnId = "extra-egg" | "extra-chicken" | "brown-rice" | "extra-dressing";

export type AddOn = {
  id: AddOnId;
  name: string;
  priceSen: Sen;
  kcal: number;
  proteinG: number;
  bom: BomLine[];
  maxQty: number;
};

export const ADDONS: Record<AddOnId, AddOn> = {
  "extra-egg": { id: "extra-egg", name: "Extra egg", priceSen: 150, kcal: 72, proteinG: 6, bom: [{ ingredient: "egg", qty: 1 }], maxQty: 3 },
  "extra-chicken": { id: "extra-chicken", name: "Extra chicken · 80 g", priceSen: 500, kcal: 96, proteinG: 18, bom: [{ ingredient: "chicken", qty: 80 }], maxQty: 2 },
  "brown-rice": { id: "brown-rice", name: "Brown rice base · 60 g", priceSen: 250, kcal: 216, proteinG: 5, bom: [{ ingredient: "brown_rice", qty: 60 }], maxQty: 1 },
  "extra-dressing": { id: "extra-dressing", name: "Extra dressing cup", priceSen: 150, kcal: 0, proteinG: 0, bom: [], maxQty: 2 },
};

export type LeaveOutId = "cabbage" | "carrot" | "tomato" | "corn" | "cucumber";

export const LEAVE_OUTS: { id: LeaveOutId; name: string }[] = [
  { id: "corn", name: "Corn" },
  { id: "cabbage", name: "Cabbage" },
  { id: "tomato", name: "Tomato" },
  { id: "carrot", name: "Carrot" },
  { id: "cucumber", name: "Cucumber" },
];

export const PACKAGING_SEN: Sen = 132;
export const WASTE_FACTOR = 1.05;

export function getBowl(slug: string): Bowl | undefined {
  return BOWLS.find((b) => b.slug === slug);
}

export function isBowlSlug(slug: string): slug is BowlSlug {
  return BOWLS.some((b) => b.slug === slug);
}

export function isDressingCode(code: string): code is DressingCode {
  return code === "HM" || code === "RS" || code === "LY";
}

export function isAddOnId(id: string): id is AddOnId {
  return id in ADDONS;
}

export function isLeaveOutId(id: string): id is LeaveOutId {
  return LEAVE_OUTS.some((l) => l.id === id);
}

function bomCost(lines: BomLine[]): number {
  return lines.reduce((sum, l) => {
    const ing = INGREDIENTS[l.ingredient];
    return sum + (ing.unit === "g" ? (l.qty / 1000) * ing.costSen : l.qty * ing.costSen);
  }, 0);
}

/** Cost of goods for one standard bowl: food incl. 5% waste, plus the packaging set. */
export function bowlCogsSen(bowl: Bowl): Sen {
  const food = (bomCost(BASE_BOM) + bomCost(bowl.toppings) + bowl.marinadeSen + DRESSINGS[bowl.dressing].cupCostSen) * WASTE_FACTOR;
  return Math.round(food) + PACKAGING_SEN;
}
