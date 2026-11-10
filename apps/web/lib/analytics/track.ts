import { track } from "@vercel/analytics";
import { getInboundUtmSource } from "./utm";

// Typed wrapper over Vercel Analytics `track`. Exactly three events.
// Props are short slugs only: never emails, names, prompts or free text.

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

export function trackEvent<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEvents[E],
  deps: {
    send?: (name: string, props: Record<string, string>) => void;
    utmSource?: string | undefined;
  } = {},
): void {
  const send = deps.send ?? track;
  const utmSource =
    "utmSource" in deps ? deps.utmSource : getInboundUtmSource();
  const payload: Record<string, string> = { ...props };
  if (utmSource) payload.utm_source = utmSource;
  try {
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
