export type ProteinKind = "chicken" | "teriyaki" | "salmon" | "egg";

export type Bowl = {
  slug: string;
  name: string;
  tag: string;
  description: string;
  /** Money is always stored in sen (integer), never as a decimal. */
  priceSen: number;
  kcal: number;
  proteinG: number;
  dressing: string;
  allergens: string[];
  protein: ProteinKind;
};

export const BOWLS: Bowl[] = [
  {
    slug: "field-classic",
    name: "The Field Classic",
    tag: "Bestseller",
    description:
      "Paprika-garlic grilled chicken breast, soft-boiled egg and the full rainbow base.",
    priceSen: 1590,
    kcal: 430,
    proteinG: 38,
    dressing: "Honey Mustard",
    allergens: ["egg", "mustard"],
    protein: "chicken",
  },
  {
    slug: "sesame-teriyaki",
    name: "The Sesame Teriyaki",
    tag: "Signature",
    description:
      "Pan-seared chicken glazed in honey-soy, toasted sesame, spring onion and egg.",
    priceSen: 1690,
    kcal: 480,
    proteinG: 37,
    dressing: "Roasted Sesame",
    allergens: ["egg", "soy", "sesame"],
    protein: "teriyaki",
  },
  {
    slug: "harbour-salmon",
    name: "The Harbour Salmon",
    tag: "Premium",
    description:
      "Oven-baked salmon fillet, lemon pepper, red onion, lemon wedge and egg.",
    priceSen: 2690,
    kcal: 520,
    proteinG: 33,
    dressing: "Lemon Herb Yogurt",
    allergens: ["fish", "egg", "milk"],
    protein: "salmon",
  },
  {
    slug: "garden-two-egg",
    name: "The Garden Two-Egg",
    tag: "Meat-free",
    description:
      "Two eggs, edamame and the full rainbow base. Light, filling, meat-free.",
    priceSen: 1190,
    kcal: 340,
    proteinG: 21,
    dressing: "Lemon Herb Yogurt",
    allergens: ["egg", "soy", "milk"],
    protein: "egg",
  },
];

/** The kitchen's WhatsApp line (014-243 4391) in international format. */
export const KITCHEN_WHATSAPP = "60142434391";

export function formatRM(sen: number): string {
  return `RM${(sen / 100).toFixed(2)}`;
}
