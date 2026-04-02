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
  | "Primrose Hill (NW1)";

export type EPCRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface PropertyMetadata {
  first_seen: string;
  last_seen: string;
  discovery_count: number;
  is_new: boolean;
}

export interface Property {
  id: string;
  metadata: PropertyMetadata;
  address: string;
  area: Area;
  image_url: string;
  gallery: string[];
  streetview_url: string;
  floorplan_url?: string;
  list_price: number;
  realistic_price: number;
  sqft: number;
  price_per_sqm: number;
  nearest_tube_distance: number;
  park_proximity: number;
  commute_paternoster: number;
  commute_canada_square: number;
  is_value_buy: boolean;
  vetted: boolean;
  epc: EPCRating;
  tenure: string;
  service_charge: number;
  ground_rent: number;
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
  // FE-166: Price history entries for Property Price Evolution chart
  price_history?: PriceHistoryEntry[];
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
