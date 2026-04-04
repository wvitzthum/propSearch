# `data/sources/` — Source Data Files

All raw source files that have been extracted and incorporated into `macro_trend.json`.
Provenance paths in `macro_trend.json` reference these files directly.

---

## Refresh Schedule

| Source | Refresh Cadence | Last Updated |
|--------|---------------|-------------|
| Land Registry HPI CSVs | Monthly (around 10th) | 2026-04-04 |
| BoE Mortgage EIR Rates | Monthly | 2026-04-04 |
| ONS IPHR Rental Index | Monthly (Jan release) | 2026-04-04 |
| BoE IIP / Balance of Payments | Quarterly | 2026-04-04 |
| DLUHC EPC Live Tables | Quarterly | 2026-04-04 |
| MPT Transaction Volumes | Monthly | 2026-04-04 |

---

## File Inventory

### Land Registry / ONS UK HPI
**Publisher:** HM Land Registry + Office for National Statistics  
**Landing page:** https://www.gov.uk/government/statistical-data-sets/uk-hpi  
**Download direct:** https://www.gov.uk/government/publications/uk-house-price-index

```
processed/Indices-2026-01.csv           # Monthly HPI by area (base Jan 2023=100), 1968–present
processed/Average-prices-2026-01.csv    # Monthly average prices by LA, 1968–present
processed/Sales-2026-01.csv             # Monthly transaction volumes by area, 1995–present
processed/Cash-mortgage-sales-2026-01.csv   # Cash vs mortgage splits by area, 2012–present
processed/New-and-Old-2026-01.csv       # New build vs existing dwelling prices, 1968–present
```

**Refresh:** Download the latest ZIP from gov.uk → extract → replace files in `processed/`.  
**Naming pattern:** `Indices-YYYY-MM.csv`, `Average-prices-YYYY-MM.csv`, etc.  
**In macro_trend.json:** `hpi_history`, `area_prices`, `london_premium_index`, `transaction_volumes`, `cash_vs_mortgage`, `property_type_composition`

---

### Bank of England — Mortgage Effective Interest Rates
**Publisher:** Bank of England  
**Landing page:** https://www.bankofengland.co.uk/boeapps/database/  
**Download direct:** https://www.bankofengland.co.uk/boeapps/database/index.aspx?idx=MCI

```
processed/BoE-Database_export.csv         # BoE EIR: 2yr/3yr/5yr/10yr fixed @ 75% LTV (Apr 2024–present)
processed/BoE-Database_export (1).csv   # BoE EIR: 2yr fixed @ 60%/75%/85%/90%/95% LTV (Apr 2024–present)
```

**Refresh:** Use the BoE database export tool — select series "MCI" for mortgage rates.
Search for "Effective Interest Rates – mortgage" and export as CSV.  
**⚠️ Historical gap:** BoE only publishes ~24 months of EIR data directly. Pre-2024 backfill uses BoE base rate + documented spread methodology (in `DAT-178_mortgage_rate_research.json`).  
**In macro_trend.json:** `mortgage_history`

---

### ONS — Index of Private Housing Rental Prices (IPHRP)
**Publisher:** Office for National Statistics  
**Landing page:** https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/privaterentalpricemonthlyandquarterlyhistoridata  
**Download direct:** https://www.ons.gov.uk/file?uri=/economy/inflationandpriceindices/datasets/privaterentalpricemonthlyandquarterlyhistoridata/current

```
processed/iphrpreferencetablejanuary2024accessible1.xlsx
```

**Refresh:** Download the latest XLSX from the ONS page above.  
**Naming pattern:** `iphrpreferencetablejanuaryYYYYaccessible.xlsx` (updated each January).  
**Note:** ONS revised the IPHRP methodology in January 2024 — older data may not be directly comparable.  
**In macro_trend.json:** `rental_yields`

---

### Bank of England — International Investment Position (IIP)
**Publisher:** Bank of England  
**Landing page:** https://www.bankofengland.co.uk/statistics/balance-of-payments  
**Download direct:** https://www.bankofengland.co.uk/-/media/boe files/statistics/balance-of-payments/quarterly.csv

```
processed/pnbp.csv   # UK IIP + Balance of Payments, quarterly 1946–present
```

**Refresh:** Download the latest `quarterly.csv` from the BoE balance of payments page.  
**Key columns used:** FDI Inward Stock/Flow, Current Account % GDP, Property Income Credits/Debits.  
**In macro_trend.json:** `international_capital_flows`

---

### HMRC / ONS — Monthly Property Transactions
**Publisher:** HM Revenue & Customs + ONS  
**Landing page:** https://www.gov.uk/government/statistics/monthly-property-transactions-completed-in-the-uk-with-value-of-40000-or-above

```
processed/MPT_Tab_Mar_26.ods              # UK residential + non-residential transaction counts (monthly/quarterly/annual)
processed/UK monthly property transactions commentary - GOV.UK.html  # Commentary text
```

**Refresh:** Download the latest ODS from gov.uk.  
**Naming pattern:** `MPT_Tab_MMM_YY.ods` (e.g. `MPT_Tab_Jun_26.ods`).  
**In macro_trend.json:** Used as reference for UK transaction volumes context.

---

### DLUHC — Energy Performance Certificates (EPC)
**Publisher:** Department for Levelling Up, Housing and Communities  
**Landing page:** https://www.gov.uk/government/statistical-data-sets/live-tables-on-energy-performance-of-buildings-certificates  
**Download direct:** https://www.gov.uk/government/statistical-data-sets/live-tables-on-energy-performance-of-buildings-certificates

```
processed/D1-Domestic_Properties.ods    # Domestic properties by LA by EPC rating band (A–G), quarterly 2008–present
```

**Refresh:** Find "Table D1 – domestic properties by local authority by energy efficiency rating" → download ODS.  
**Sheet used:** Sheet 7 (Local Authority level, not Sheet 6 which is regional).  
**Naming pattern:** `D1-Domestic_Properties.ods` (same filename each quarter, versioned by download date).  
**In macro_trend.json:** `epc_distribution`

---

## Existing Citation Files

| File | What It Covers |
|------|----------------|
| `boe_citation.md` | BoE base rate, MPC meetings, mortgage EIR rates |
| `land_registry_citation.md` | UK HPI, regional data, price paid |
| `fx_citation.md` | GBP/USD exchange rate, international arbitrage |
| `swap_rate_citation.md` | 2yr/5yr swap rates, mortgage pricing signals |
| `hmrc_sdlt_citation.md` | SDLT rates, BTL surcharge, FTB relief |

These document the original data sources, methodology notes, and source URLs.
