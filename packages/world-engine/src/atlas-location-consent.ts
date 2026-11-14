import { Coordinate } from '@arcanea/schemas/atlas-world';

export type LocationConsent = { subjectId: string; purpose: 'atlas-display'; precision: 'coarse' | 'precise'; grantedAt: string; expiresAt: string; revokedAt: string | null };
/** No collection, geolocation prompt, storage or third-party transmission occurs here. */
export function consentedLocation(subjectId: string, point: unknown, consent: LocationConsent | null, now = new Date()): Coordinate | null {
  if (!consent || consent.subjectId !== subjectId || consent.purpose !== 'atlas-display' || consent.revokedAt || !Number.isFinite(Date.parse(consent.grantedAt)) || !Number.isFinite(Date.parse(consent.expiresAt)) || Date.parse(consent.grantedAt) > +now || Date.parse(consent.expiresAt) <= +now) return null;
  const parsed = Coordinate.safeParse(point);
  if (!parsed.success || parsed.data.system !== 'wgs84') return null;
  const p = parsed.data;
  // Coarse means a ~11 km grid. Altitude is removed, not merely hidden by the UI.
  return consent.precision === 'coarse' ? { system: 'wgs84', longitude: Math.round(p.longitude * 10) / 10, latitude: Math.round(p.latitude * 10) / 10 } : p;
}
