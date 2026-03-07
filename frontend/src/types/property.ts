export type Area =
  | "Islington (N1)"
  | "Islington (N7)"
  | "Bayswater (W2)"
  | "Belsize Park (NW3)"
  | "West Hampstead (NW6)";

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
  list_price: number;
  realistic_price: number;
  sqft: number;
  price_per_sqm: number;
  nearest_tube_distance: number;
  park_proximity: number;
  commute_paternoster: number;
  commute_canada_square: number;
  is_value_buy: boolean;
  epc: EPCRating;
  tenure: string;
  dom: number;
  neg_strategy: string;
  alpha_score: number;
  appreciation_potential: number;
  links: string[];
}
