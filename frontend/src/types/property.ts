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
  list_price: number;
  realistic_price: number;
  sqft: number;
  price_per_sqm: number;
  is_value_buy: boolean;
  epc: EPCRating;
  tenure: string;
  dom: number;
  neg_strategy: string;
  alpha_score: number;
  link: string;
}
