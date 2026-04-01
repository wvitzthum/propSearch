// Helper type for provenance-wrapped values
export interface Provenance<T> {
  value: T;
  source?: string;
  source_url?: string;
  methodology?: string;
  last_refreshed?: string;
}

// Type that can be either a primitive or provenance-wrapped
export type ProvenanceOrValue<T> = T | Provenance<T>;

// Helper to extract value from provenance or return primitive
export const extractValue = <T>(val: ProvenanceOrValue<T> | undefined | null): T | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && 'value' in val) return (val as Provenance<T>).value;
  return val as T;
};

export interface LondonHPI {
  mom_pct: ProvenanceOrValue<number>;
  yoy_pct: ProvenanceOrValue<number>;
  annual_change?: ProvenanceOrValue<number>;
  monthly_change?: ProvenanceOrValue<number>;
  avg_price_pcl: ProvenanceOrValue<number>;
  avg_price?: ProvenanceOrValue<number>;
  last_updated?: string;
}

export interface InventoryVelocity {
  months_of_supply: ProvenanceOrValue<number>;
  new_instructions_q_change: ProvenanceOrValue<number>;
}

export interface NegotiationDelta {
  avg_discount_pct: ProvenanceOrValue<number>;
  pct_below_asking: ProvenanceOrValue<number>;
  market_sentiment?: ProvenanceOrValue<string>;
}

export interface AreaHeatIndex {
  area: string;
  score: ProvenanceOrValue<number>;
  trend?: string;
}

export interface MortgageRates {
  "90_ltv_2yr_fixed": ProvenanceOrValue<number>;
  "90_ltv_5yr_fixed": ProvenanceOrValue<number>;
  "85_ltv_5yr_fixed": ProvenanceOrValue<number>;
  "75_ltv_5yr_fixed": ProvenanceOrValue<number>;
  "60_ltv_5yr_fixed": ProvenanceOrValue<number>;
  avg_fees: ProvenanceOrValue<number>;
}

export interface EconomicIndicators {
  boe_base_rate: ProvenanceOrValue<number>;
  gbp_usd: ProvenanceOrValue<number>;
  uk_inflation_cpi: ProvenanceOrValue<number>;
  mortgage_rates: MortgageRates;
  mpc_next_meeting?: string;
  market_consensus?: string;
  inflation_target?: ProvenanceOrValue<number>;
}

export interface MarketBusiness {
  month: string;
  listed: ProvenanceOrValue<number>;
  sold?: ProvenanceOrValue<number>;
  split?: ProvenanceOrValue<number>;
}

export interface TimingSignals {
  seasonal_buy_score: ProvenanceOrValue<number>;
  optimal_window_description: string;
}

export interface MortgageHistoryEntry {
  month: string;
  boe_rate: ProvenanceOrValue<number>;
  mortgage_2yr: ProvenanceOrValue<number>;
  mortgage_5yr: ProvenanceOrValue<number>;
  cpi: ProvenanceOrValue<number>;
}

export interface MacroTrend {
  london_hpi?: LondonHPI;
  inventory_velocity?: InventoryVelocity;
  negotiation_delta?: NegotiationDelta;
  area_heat_index?: AreaHeatIndex[];
  economic_indicators?: EconomicIndicators;
  market_business?: MarketBusiness[];
  business_history?: MarketBusiness[];
  timing_signals?: TimingSignals;
  market_pulse_summary?: ProvenanceOrValue<string>;
  mortgage_history?: MortgageHistoryEntry[];
  sdlt_countdown?: string;
  epc_deadline_risk?: string;
}
