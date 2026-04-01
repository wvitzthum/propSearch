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
  // FE-164: Market Conditions Radar
  boe_rate_consensus?: BoERateConsensus;
  swap_rates?: SwapRates;
  hpi_forecasts?: HPIForecast[];
  area_trends?: AreaTrend[];
  // FE-155: Data Provenance
  _source_citations?: Record<string, {
    name: string;
    url?: string;
    data_used?: string[];
  }>;
}

// FE-164: BoE Rate Consensus (Q3 2026 - Q2 2027)
export interface BoERateConsensus {
  current_rate: ProvenanceOrValue<number>;
  scenarios: {
    bear: RateScenario; // rate rises (bad for buyers)
    base: RateScenario; // central expectation
    bull: RateScenario; // rate falls (good for buyers)
  };
  mpc_dates?: string[]; // MPC meeting dates in period
}

export interface RateScenario {
  label: string;
  end_q2_2027_rate: ProvenanceOrValue<number>;
  path: ProvenanceOrValue<number>[]; // quarterly rate values
}

// FE-164: GBP Swap Rates (leading mortgage indicators)
export interface SwapRates {
 gbp_2yr: ProvenanceOrValue<number>;
  gbp_5yr: ProvenanceOrValue<number>;
  trend_2yr: 'rising' | 'falling' | 'holding';
  trend_5yr: 'rising' | 'falling' | 'holding';
  history_2yr?: SwapRatePoint[];
  history_5yr?: SwapRatePoint[];
}

export interface SwapRatePoint {
  month: string;
  rate: ProvenanceOrValue<number>;
}

// FE-164: HPI Forecasts (12-month regional forecasts)
export interface HPIForecast {
  area: string;
  forecast_12m: ProvenanceOrValue<number>; // % change expected
  london_benchmark: ProvenanceOrValue<number>; // % change for London-wide
  delta: number; // computed: forecast_12m - london_benchmark
}

// FE-164: Area Trends (detailed borough performance)
export interface AreaTrend {
  area: string;
  heat_index: ProvenanceOrValue<number>;
  annual_growth: ProvenanceOrValue<number>;
  hpi_forecast_12m?: ProvenanceOrValue<number>;
  london_benchmark?: ProvenanceOrValue<number>;
  delta?: number; // computed
  months_of_supply?: ProvenanceOrValue<number>;
}

// FE-152: Appreciation Model types
export interface AppreciationScenarios {
  bear: AppreciationScenario;
  base: AppreciationScenario;
  bull: AppreciationScenario;
}

export interface AppreciationScenario {
  probability: number;       // e.g. 15
  annual_return: number;     // e.g. -1.5 (%)
  five_year_total: number;   // e.g. -7.3 (%)
  trigger: string;           // market trigger description
}

export interface PropertyAdjustmentFactors {
  lease_risk: {
    under_80_years: number;
    '80_to_90_years': number;
    '90_to_125_years': number;
    over_125_years: number;
  };
  epc_rating: {
    rating_a_to_b: number;
    rating_c: number;
    rating_d: number;
    rating_e_to_g: number;
  };
  floor_level: {
    ground_floor: number;
    standard_floor: number;
    upper_floor_with_lift: number;
    penthouse: number;
  };
  service_charge: {
    high_charge_penalty: number;
    threshold_annual: number;
  };
}

export interface PostcodeVolatility {
  annual_volatility: number;
  standard_deviation: number;
  correlation_with_london: number;
}

export interface RentalYieldEstimate {
  gross_yield: number;
  net_yield: number;
}

export interface AppreciationModel {
  scenario_definitions: AppreciationScenarios;
  property_adjustments: PropertyAdjustmentFactors;
  postcode_volatility: Record<string, PostcodeVolatility>;
  rental_yield_estimates: Record<string, RentalYieldEstimate>;
  boe_rate_path_fan: {
    scenarios: Array<{
      q: string;
      bear: number;
      base: number;
      bull: number;
    }>;
  };
  monte_carlo_parameters: {
    iterations: number;
    time_horizon_years: number;
    confidence_intervals: Record<string, string>;
    random_walk_parameters: {
      drift: number;
      volatility_range: [number, number];
    };
  };
  appreciation_calculation: {
    scenario_definitions: {
      bear: { five_year_total_pct: number; annual_avg_pct: number };
      base: { five_year_total_pct: number; annual_avg_pct: number };
      bull: { five_year_total_pct: number; annual_avg_pct: number };
    };
    example_600k_property: {
      current_price_gbp: number;
      bear_5yr_gbp: number;
      base_5yr_gbp: number;
      bull_5yr_gbp: number;
    };
  };
}

// FE-152: Computed appreciation result per scenario
export interface ScenarioResult {
  scenario: 'bear' | 'base' | 'bull';
  label: string;
  color: string;
  annual_return: number;
  five_year_total: number;
  five_year_value: number;
  probability: number;
  cumulative_gain: number;
}

export interface AppreciationProfile {
  currentPrice: number;
  riskFreeRate: number; // current BoE base rate
  scenarios: ScenarioResult[];
  expectedValue: number;
  weightedIRR: number;
  portfolioAlpha: number; // vs risk-free
}
