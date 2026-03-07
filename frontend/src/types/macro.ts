export interface LondonHPI {
  mom_pct: number;
  yoy_pct: number;
  avg_price_pcl: number;
  last_updated: string;
}

export interface InventoryVelocity {
  months_of_supply: number;
  new_instructions_q_change: number;
  avg_days_to_under_offer: number;
}

export interface NegotiationDelta {
  avg_discount_pct: number;
  pct_below_asking: number;
  market_sentiment: string;
}

export interface AreaHeatIndex {
  area: string;
  score: number;
  trend: 'Rising' | 'Stable' | 'High Demand' | 'Falling';
}

export interface EconomicIndicators {
  boe_base_rate: number;
  gbp_usd: number;
  uk_inflation_cpi: number;
}

export interface BusinessHistory {
  month: string;
  listed: number;
  sold: number;
}

export interface MacroTrend {
  london_hpi: LondonHPI;
  inventory_velocity: InventoryVelocity;
  negotiation_delta: NegotiationDelta;
  area_heat_index: AreaHeatIndex[];
  economic_indicators: EconomicIndicators;
  business_history: BusinessHistory[];
  market_pulse_summary: string;
}
