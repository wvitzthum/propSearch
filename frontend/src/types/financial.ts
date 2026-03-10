export interface CouncilTaxBand {
  [year: string]: number;
}

export interface CouncilTaxInfo {
  council?: string;
  area?: string;
  areas?: string[];
  annual_cost?: number;
  bands?: {
    [band: string]: CouncilTaxBand;
  };
}

export interface FinancialContext {
  council_tax: CouncilTaxInfo[];
  definitions: {
    source: string;
    updated_at: string;
  };
}
