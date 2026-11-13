import { track } from "@vercel/analytics";
import { getInboundUtmSource, parseUtmSource } from "./utm";

// Typed wrapper over Vercel Analytics `track`. Exactly three events.
// Props are short slug-shaped labels, validated at runtime (closed event list,
// exact keys, bounded slugs). Slug syntax cannot prove a value is non-personal,
// so callers must still pass static labels, never user-supplied text.

export type PriceBand = "free" | "under_10" | "10_to_49" | "50_plus";

export type AnalyticsEvents = {
  waitlist_join: { product: string; source: string };
  cta_click: { cta: string; location: string };
  checkout_start: { product: string; price_band: PriceBand };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/** Bucket a euro-cent price into a coarse band (never the exact amount). */
export function priceBand(priceCents: number): PriceBand {
  if (priceCents <= 0) return "free";
  if (priceCents < 1000) return "under_10";
  if (priceCents < 5000) return "10_to_49";
  return "50_plus";
}

const PRICE_BANDS: readonly PriceBand[] = [
  "free",
  "under_10",
  "10_to_49",
  "50_plus",
];
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const isSlug = (v: unknown): v is string =>
  typeof v === "string" && SLUG_RE.test(v);

// Closed lookup: event name -> declared keys and their validators.
const SCHEMAS: Record<
  AnalyticsEventName,
  Record<string, (v: unknown) => boolean>
> = {
  waitlist_join: { product: isSlug, source: isSlug },
  cta_click: { cta: isSlug, location: isSlug },
  checkout_start: {
    product: isSlug,
    price_band: (v) => PRICE_BANDS.includes(v as PriceBand),
  },
};

/** Build the outgoing payload from declared keys only, or null if invalid. */
function buildPayload(
  name: unknown,
  props: unknown,
): Record<string, string> | null {
  if (typeof name !== "string" || !Object.hasOwn(SCHEMAS, name)) return null;
  if (props === null || typeof props !== "object") return null;
  const schema = SCHEMAS[name as AnalyticsEventName];
  const declared = Object.keys(schema);
  const record = props as Record<string, unknown>;
  if (Object.keys(record).length !== declared.length) return null;
  const payload: Record<string, string> = {};
  for (const key of declared) {
    if (!Object.hasOwn(record, key) || !schema[key](record[key])) return null;
    payload[key] = record[key] as string;
  }
  return payload;
}

export function trackEvent<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEvents[E],
  deps: {
    send?: (name: string, props: Record<string, string>) => void;
    utmSource?: string | undefined;
  } = {},
): void {
  try {
    const payload = buildPayload(name, props);
    if (!payload) return; // invalid event: drop, never throw
    const send = deps.send ?? track;
    const rawUtm = "utmSource" in deps ? deps.utmSource : getInboundUtmSource();
    const utmSource = parseUtmSource(rawUtm);
    if (utmSource) payload.utm_source = utmSource;
    send(name, payload);
  } catch {
    // Analytics must never break the UI.
  }
}

export const trackWaitlistJoin = (props: AnalyticsEvents["waitlist_join"]) =>
  trackEvent("waitlist_join", props);
export const trackCtaClick = (props: AnalyticsEvents["cta_click"]) =>
  trackEvent("cta_click", props);
export const trackCheckoutStart = (props: AnalyticsEvents["checkout_start"]) =>
  trackEvent("checkout_start", props);
