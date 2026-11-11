# Analytics events and UTM conventions

## Events (`apps/web/lib/analytics/track.ts`)

Typed wrapper over `track` from `@vercel/analytics`. Exactly three events. Props are validated at runtime (closed event list, exact keys, slug-shaped bounded strings, `price_band` enum; invalid events are dropped silently). Slug syntax cannot prove a value is non-personal, so callers must pass static labels only, never user-supplied text:

| Event            | Props                   | Fires                                                                                                            |
| ---------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `waitlist_join`  | `product`, `source`     | Client success path of a waitlist/newsletter submit                                                              |
| `cta_click`      | `cta`, `location`       | Click on a primary CTA                                                                                           |
| `checkout_start` | `product`, `price_band` | Click on a pricing buy button, before checkout logic. This is intent, not a completed checkout, order or revenue |

`price_band` is one of `free`, `under_10`, `10_to_49`, `50_plus` (euro, tax-inclusive monthly or pack price). Each event also carries `utm_source` when the visit arrived with a valid one (kept in `sessionStorage` for the tab).

## UTM

- `utm_source`: `x`, `linkedin`, `youtube`, `newsletter`, `circle`, `github`, or a partner-name slug
- `utm_medium`: `social`, `email`, `community`, `referral`, `partner`
- `utm_campaign`: `yyyy-mm-slug`, e.g. `2026-11-launch`

Build tagged links with `withUtm(url, { source, medium, campaign })` from `apps/web/lib/analytics/utm.ts`; it throws on values outside these rules. Never put emails, names or user IDs in any UTM value.
