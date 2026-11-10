// UTM conventions: see docs/analytics-utm.md. No PII; values are slug-shaped.

export const UTM_SOURCES = [
  "x",
  "linkedin",
  "youtube",
  "newsletter",
  "circle",
  "github",
] as const;
export const UTM_MEDIUMS = [
  "social",
  "email",
  "community",
  "referral",
  "partner",
] as const;

export type UtmMedium = (typeof UTM_MEDIUMS)[number];

export type UtmParams = {
  /** One of UTM_SOURCES, or a partner-name slug. */
  source: string;
  medium: UtmMedium;
  /** yyyy-mm-slug, e.g. 2026-11-launch. */
  campaign: string;
};

const SOURCE_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const CAMPAIGN_RE = /^\d{4}-(0[1-9]|1[0-2])-[a-z0-9][a-z0-9-]{0,39}$/;

/** Append validated utm_* params. Throws on invalid input so bad tags fail in dev/tests. */
export function withUtm(url: string, params: UtmParams): string {
  if (!SOURCE_RE.test(params.source)) {
    throw new Error(`Invalid utm_source: ${params.source}`);
  }
  if (!UTM_MEDIUMS.includes(params.medium)) {
    throw new Error(`Invalid utm_medium: ${params.medium}`);
  }
  if (!CAMPAIGN_RE.test(params.campaign)) {
    throw new Error(`Invalid utm_campaign: ${params.campaign}`);
  }
  const hashIndex = url.indexOf("#");
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = base.indexOf("?");
  const path = queryIndex === -1 ? base : base.slice(0, queryIndex);
  const search = new URLSearchParams(
    queryIndex === -1 ? "" : base.slice(queryIndex + 1),
  );
  search.set("utm_source", params.source);
  search.set("utm_medium", params.medium);
  search.set("utm_campaign", params.campaign);
  return `${path}?${search.toString()}${hash}`;
}

/** Sanitize an inbound utm_source; returns undefined if it is not slug-shaped. */
export function parseUtmSource(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();
  return SOURCE_RE.test(value) ? value : undefined;
}

const STORE_KEY = "arc_utm_source";

/** Inbound utm_source from the current URL, remembered for the tab session. */
export function getInboundUtmSource(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fromUrl = parseUtmSource(
    new URLSearchParams(window.location.search).get("utm_source"),
  );
  try {
    if (fromUrl) {
      window.sessionStorage.setItem(STORE_KEY, fromUrl);
      return fromUrl;
    }
    return parseUtmSource(window.sessionStorage.getItem(STORE_KEY));
  } catch {
    return fromUrl;
  }
}
