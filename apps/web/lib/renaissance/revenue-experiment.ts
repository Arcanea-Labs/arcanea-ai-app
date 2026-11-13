/**
 * Arcanea Creative Renaissance — Bounded Revenue Experiment & Gate G5 Demand-Capture Engine
 *
 * Reconciles the commercial doctrine tension between:
 * 1. `frankxai/starlight-estate/TRUTH.md` §2 (`[RULED]`: BYOK, zero multi-tenant SaaS,
 *    pre-launch surfaces are waitlists capturing role + fair price band for Gate G5)
 * 2. `DEMAND-CAPTURE-OFFERS.md` (`Give -> Prove -> Position -> Invite`, status over discount,
 *    permanent price lock + named credit in `FOUNDERS.md`, zero seeded counts)
 * 3. `apps/web/lib/shop/catalog.ts` (`SHOP_EDITIONS`, all `priceState: "proposed"` & fail-closed)
 * 4. Notion 90-Day Execution Programme & Issue #276 ladder (Free World Seed -> €7 Canon Starter ->
 *    €29 Living Cosmos First Edition -> €99 Worldbuilder Production Edition -> €299 Studio License)
 */

export const REVENUE_EXPERIMENT_ID = "EXP-ARC-2026-Q4-G5" as const;

export type BuyerRoleId =
  | "worldbuilder"
  | "author"
  | "gamedev"
  | "collector"
  | "studio";

export type FairPriceBandId =
  | "eur7"
  | "eur29"
  | "eur49"
  | "eur99"
  | "eur299";

export interface DemandRoleOption {
  id: BuyerRoleId;
  label: string;
}

export interface FairPriceBandOption {
  id: FairPriceBandId;
  amountEur: number;
  label: string;
  tierMapping: string;
}

export const SHOP_DEMAND_ROLES: readonly DemandRoleOption[] = [
  { id: "worldbuilder", label: "Worldbuilder / Lore Architect" },
  { id: "author", label: "Novelist / Narrative Designer" },
  { id: "gamedev", label: "Game / Tabletop Creator" },
  { id: "collector", label: "Art & Lore Collector" },
  { id: "studio", label: "Small Studio / Creative Team" },
] as const;

export const SHOP_PRICE_BANDS: readonly FairPriceBandOption[] = [
  {
    id: "eur7",
    amountEur: 7,
    label: "€7 — Canon Starter (Pocket Bible + 10 Gate Cards)",
    tierMapping: "canon-starter-proposed",
  },
  {
    id: "eur29",
    amountEur: 29,
    label: "€29 — Living Cosmos First Edition (Collector Art + Booklet)",
    tierMapping: "living-cosmos-first-edition",
  },
  {
    id: "eur49",
    amountEur: 49,
    label: "€49 — Solo Creator Kit (Templates + Continuity Rubrics)",
    tierMapping: "worldbuilder-solo-bridge",
  },
  {
    id: "eur99",
    amountEur: 99,
    label: "€99 — Worldbuilder Production Edition (Full Kit + Schemas)",
    tierMapping: "worldbuilder-production-edition",
  },
  {
    id: "eur299",
    amountEur: 299,
    label: "€299 — Studio License (Up to 5 Collaborators)",
    tierMapping: "worldbuilder-studio-license",
  },
] as const;

const EDITION_SHORT_CODES: Record<string, string> = {
  "worldbuilder-production-edition": "wb_prod",
  "worldbuilder-studio-license": "wb_studio",
  "living-cosmos-first-edition": "cosmos_fe",
  "first-collection-bundle": "first_bundle",
  "canon-starter": "canon_start",
};

const SHORT_CODE_TO_EDITION: Record<string, string> = Object.fromEntries(
  Object.entries(EDITION_SHORT_CODES).map(([slug, code]) => [code, slug]),
);

/**
 * Encodes an edition slug, buyer role, and fair price band into a deterministic
 * `source` identifier that strictly matches `/api/waitlist`'s `^[a-z0-9_]{1,64}$`
 * validation contract and `public.waitlists (email, source)` unique constraint.
 */
export function encodeShopWaitlistSource(
  editionSlug: string,
  role: BuyerRoleId = "worldbuilder",
  priceBand: FairPriceBandId = "eur29",
): string {
  const editionCode =
    EDITION_SHORT_CODES[editionSlug] ??
    editionSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 18);

  const safeRole = SHOP_DEMAND_ROLES.some((r) => r.id === role)
    ? role
    : "worldbuilder";
  const safeBand = SHOP_PRICE_BANDS.some((b) => b.id === priceBand)
    ? priceBand
    : "eur29";

  const encoded = `shop_${editionCode}_${safeRole}_${safeBand}`;
  return encoded.slice(0, 64);
}

/**
 * Decodes a `shop_<editionCode>_<role>_<priceBand>` source string back into
 * structured Gate G5 demand-capture dimensions for revenue reporting.
 */
export function decodeShopWaitlistSource(source: string): {
  isShopDemandSignal: boolean;
  editionSlug: string | null;
  role: BuyerRoleId | null;
  priceBand: FairPriceBandId | null;
  impliedPriceEur: number | null;
} {
  const match = /^shop_([a-z0-9_]+)_(worldbuilder|author|gamedev|collector|studio)_(eur7|eur29|eur49|eur99|eur299)$/.exec(
    source,
  );
  if (!match) {
    return {
      isShopDemandSignal: false,
      editionSlug: null,
      role: null,
      priceBand: null,
      impliedPriceEur: null,
    };
  }

  const [, editionCode, rawRole, rawBand] = match;
  const role = rawRole as BuyerRoleId;
  const priceBand = rawBand as FairPriceBandId;
  const bandSpec = SHOP_PRICE_BANDS.find((b) => b.id === priceBand);

  return {
    isShopDemandSignal: true,
    editionSlug: SHORT_CODE_TO_EDITION[editionCode] ?? editionCode,
    role,
    priceBand,
    impliedPriceEur: bandSpec?.amountEur ?? null,
  };
}

export const REVENUE_EXPERIMENT_SPEC = {
  experimentId: REVENUE_EXPERIMENT_ID,
  status: "active-demand-capture-fail-closed-checkout" as const,
  governingRule: "TRUTH.md §2 + DEMAND-CAPTURE-OFFERS.md (Give -> Prove -> Position -> Invite)",
  freeGiftBeforeAsk: {
    title: "Arcanea World Seed & Worked Sample Scene",
    routes: ["/shop/sample", "/downloads/arcanea-world-starter.json", "/shop/guides/worldbuilding-bible"],
    marginalCostUsd: 0,
  },
  foundingCohortBenefits: [
    "Launch price lock for life once Gate G5 price evidence is ratified",
    "Permanent named credit in the edition's FOUNDERS.md manifest",
    "Direct broadcast readouts from the Arcanea Creative Council (zero ticket queue)",
  ],
  graduationGatesToOpenLiveCheckout: [
    "G1: Exact file and SHA-256 asset manifest verified on disk",
    "G2: @arcanea/rights-manifest isReleaseReady() === true (counsel-reviewed license + per-asset commercial clearance)",
    "G3: Independent Critical Review score >= 85 with 0 blockers",
    "G4: Polar/Stripe production webhook & fulfillment verification (PR #721)",
    "G5: >= 50 verified Founding Cohort waitlist signals with revealed price-band distribution",
  ],
} as const;
