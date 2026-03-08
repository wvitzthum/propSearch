export interface LondonHPI {
  mom_pct: number;
  yoy_pct: number;
  avg_price_pcl: number;
  last_updated?: string;
}

export interface InventoryVelocity {
  months_of_supply: number;
  new_instructions_q_change: number;
}

export interface NegotiationDelta {
  avg_discount_pct: number;
  pct_below_asking: number;
  market_sentiment?: string;
}

export interface AreaHeatIndex {
  area: string;
  score: number;
  trend?: string;
}

export interface MortgageRates {
  "90_ltv_2yr_fixed": number;
  "90_ltv_5yr_fixed": number;
  avg_fees: number;
}

export interface EconomicIndicators {
  boe_base_rate: number;
  gbp_usd: number;
  uk_inflation_cpi: number;
  mortgage_rates: MortgageRates;
  mpc_next_meeting?: string;
  market_consensus?: string;
  inflation_target?: number;
}

export interface MarketBusiness {
  month: string;
  listed: number;
  sold?: number;
  split?: number;
}

export interface TimingSignals {
  seasonal_buy_score: number;
  optimal_window_description: string;
}

export interface MortgageHistoryEntry {
  month: string;
  boe_rate: number;
  mortgage_2yr: number;
  mortgage_5yr: number;
  cpi: number;
}

export interface MacroTrend {
  london_hpi: LondonHPI;
  inventory_velocity: InventoryVelocity;
  negotiation_delta: NegotiationDelta;
  area_heat_index: AreaHeatIndex[];
  economic_indicators: EconomicIndicators;
  market_business: MarketBusiness[];
  business_history?: MarketBusiness[]; // For compatibility
  timing_signals: TimingSignals;
  market_pulse_summary?: string;
  mortgage_history?: MortgageHistoryEntry[];
}
