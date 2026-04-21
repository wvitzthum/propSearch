export type Area =
  | "Islington (N1)"
  | "Islington (N7)"
  | "Islington (N1/N7)"
  | "Bayswater (W2)"
  | "Belsize Park (NW3)"
  | "West Hampstead (NW6)"
  | "Chelsea (SW3/SW10)"
  | "Chelsea (SW3)"
  | "Chelsea (SW10)"
  | "Primrose Hill (NW1)"
  | "Pimlico (SW1)"
  | "Bermondsey (SE1)";

export type EPCRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

/** ADR-017: Market status — analyst-owned axis. Independent of user pipeline_status. */
export type MarketStatus = 'active' | 'under_offer' | 'sold_stc' | 'sold_completed' | 'withdrawn' | 'unknown';

export interface PropertyMetadata {
  first_seen: string;
  last_seen: string;
  discovery_count: number;
  is_new: boolean;
}

export interface Property {
  id: string;
  metadata: PropertyMetadata;
  last_checked?: string; // ISO date string — FE-231: last time user manually re-checked this property
  archive_reason?: string; // Reason for archiving a property (FE-185)
  address: string;
  area: Area;
  image_url: string;
  gallery: string[];
  streetview_url: string;
  floorplan_url?: string;
  list_price: number;
  realistic_price: number;
  sqft: number;
  bedrooms?: number;    // FE-239: decimal allowed (1.5, 2.0, 3.0) for en-suite/double rooms
  bathrooms?: number;   // FE-239: decimal allowed (1.0, 1.5, 2.0)
  price_per_sqm: number;
  nearest_tube_distance: number;
  park_proximity: number;
  commute_paternoster: number;
  commute_canada_square: number;
  is_value_buy: boolean;
  vetted: boolean;
  epc: EPCRating;
  tenure: string;
  service_charge?: number;
  ground_rent?: number;
  lease_years_remaining: number;
  council_tax_band?: string;
  dom: number;
  neg_strategy: string;
  floor_level: string;
  alpha_score: number;
  appreciation_potential: number;
  price_reduction_amount?: number;
  price_reduction_percent?: number;
  days_since_reduction?: number;
  price_reduction_date?: string;
  waitrose_distance?: number;
  whole_foods_distance?: number;
  wellness_hub_distance?: number;
  epc_improvement_potential?: EPCRating;
  est_capex_requirement?: number;
  links: string[];
  link: string;
  // ADR-017: Analyst-owned market status axis (independent of user pipeline_status)
  market_status?: MarketStatus;
  // FE-186: Server-persisted pipeline status (synced from usePipeline)
  pipeline_status?: 'discovered' | 'shortlisted' | 'vetted' | 'watchlist' | 'archived';
  // UX-034: User-defined priority rank (1 = highest priority within pipeline group)
  property_rank?: number | null;
  // FE-166: Price history entries for Property Price Evolution chart
  price_history?: PriceHistoryEntry[];
  // FE-234/FE-235: User analyst notes — private observations and strategic notes per property
  analyst_notes?: string;
  // UX-58: Estimated monthly rent for yield calculation on PropertyDetail
  estimated_rent?: number | null;
  // FE-276: Annual appreciation volatility for this area (e.g. 3.2 = ±3.2%/yr)
  area_volatility?: number | null;
  // FE-277: WGS84 coordinates for map placement and distance calculations
  lat?: number;
  lng?: number;
}

// FE-166: Price history data for Property Price Evolution component
export interface PriceHistoryEntry {
  date: string;              // ISO date string e.g. "2026-03-15"
  price: number;             // Listed price on that date
  price_per_sqm: number;    // Price per sqm on that date
  status: 'listed' | 'reduced' | 'under_offer' | 'sold' | 'withdrawn';
  reduction_pct?: number;    // % reduction from previous price (only for 'reduced')
  days_on_market?: number;   // DOM on that date
  london_hpi?: number;       // London-wide HPI value on that date (for benchmark line)
}

export interface PropertyWithCoords extends Property {
  lat: number;
  lng: number;
}
