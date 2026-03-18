export type Area =
  | "Islington (N1)"
  | "Islington (N7)"
  | "Islington (N1/N7)"
  | "Bayswater (W2)"
  | "Belsize Park (NW3)"
  | "West Hampstead (NW6)"
  | "Chelsea (SW3/SW10)"
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
  price_reduction_pct?: number;
  price_reduction_date?: string;
  waitrose_distance?: number;
  wellness_hub_distance?: number;
  epc_improvement_potential?: EPCRating;
  est_capex_requirement?: number;
  links: string[];
  link: string;
}

export interface PropertyWithCoords extends Property {
  lat: number;
  lng: number;
}
