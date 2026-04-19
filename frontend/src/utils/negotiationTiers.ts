// ─── Negotiation Tier Utility ─────────────────────────────────────────────────
// Single source of truth for offer tier percentages across the application.
// Shares logic between PriceAssessment and PropertyDetail sidebar.

export interface NegotiationTier {
  label: string;
  range: string;
  colorClass: string;
  pctBelow: string;
}

/** Build three negotiation tiers from list price.
 *  strong:  -5.5% (seller motivated)
 *  mid:    -2.5% (reasonable offer)
 *  near:   -1.5% (near-ask, quick close)
 */
export function buildNegotiationTiers(listPrice: number): NegotiationTier[] {
  const strong = Math.round(listPrice * 0.945);
  const mid    = Math.round(listPrice * 0.975);
  const near   = Math.round(listPrice * 0.985);
  return [
    {
      label: 'Strong offer (seller motivated)',
      range: `${strong.toLocaleString('en-GB')} – ${Math.min(strong + 10_000, mid - 1).toLocaleString('en-GB')}`,
      colorClass: 'text-retro-green',
      pctBelow: `-${Math.round((1 - strong / listPrice) * 100)}%`,
    },
    {
      label: 'Reasonable mid offer',
      range: `${mid.toLocaleString('en-GB')} – ${(near - 1).toLocaleString('en-GB')}`,
      colorClass: 'text-blue-400',
      pctBelow: `-${Math.round((1 - mid / listPrice) * 100)}%`,
    },
    {
      label: 'Near-ask (quick close)',
      range: `${near.toLocaleString('en-GB')} – ${Math.min(near + 15_000, listPrice).toLocaleString('en-GB')}`,
      colorClass: 'text-amber-400',
      pctBelow: `-${Math.round((1 - near / listPrice) * 100)}%`,
    },
  ];
}
