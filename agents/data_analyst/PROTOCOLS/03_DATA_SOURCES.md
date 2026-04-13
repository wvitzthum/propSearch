# Data Source Priority Protocol
*Reference from: agents/data_analyst/README.md — section "Data Source Priority"*

## Rule: Always prefer official government/public sector sources. Use commercial third-party sources as fallback only.

## Priority Tiers

| Tier | Source Type | Examples | When to Use |
|------|-------------|----------|-------------|
| **Tier 1** | **Official Government** | Land Registry, ONS, Bank of England, HM Land Registry, EPC Register, HMRC, DLUHC | Primary data source. Most authoritative, legally reliable, free. |
| **Tier 2** | **Industry Standards** | RICS, Nationwide, Halifax, Zoopla Research | Supplementary context, historical series, forecasts |
| **Tier 3** | **Property Portals** | Rightmove, Zoopla, OnTheMarket | Listing data, images, floorplans, prices |
| **Tier 4** | **Agent Websites** | Knight Frank, Savills, Foxtons, KFH | Cross-reference, richer descriptions, agent-direct links |
| **Tier 5** | **Aggregator/Tech** | FlareSolverr, Jitty, PriceHub | Fallback only — when Tier 1-3 unavailable |

## Tier 1 Sources (Use First)

| Data Type | Official Source | URL |
|-----------|----------------|-----|
| Sold prices, HPI | HM Land Registry | https://landregistry.data.gov.uk/ |
| HPI index (monthly) | ONS UK House Price Index | https://www.ons.gov.uk/economy/inflationandpriceindices |
| Mortgage rates (EIR) | Bank of England | https://www.bankofengland.co.uk/boeapps/database/ |
| MPC rates, FX | Bank of England | https://www.bankofengland.co.uk/boeapps/database/ |
| EPC ratings | EPC Register | https://www.epcregister.com/ |
| SDLT rates | HMRC | https://www.gov.uk/guidance/stamp-duty-land-tax |
| Transaction volumes | HM Land Registry | https://www.gov.uk/government/statistical-data-sets/ |
| Rental statistics | ONS PRMS | https://www.ons.gov.uk/economy/inflationandpriceindices |
| MPC meeting dates | Bank of England | https://www.bankofengland.co.uk/monetary-policy |
| Interest rates | BoE Base Rate | https://www.bankofengland.co.uk/monetary-policy/the-interest-rate |

## Tier 2 Sources (Supplementary)

| Data Type | Source | URL |
|-----------|--------|-----|
| Area HPI forecasts | Oxford Economics | Via Land Registry composite |
| Prime London indices | Knight Frank Research | https://www.knightfrank.com/research/ |
| Market surveys | RICS UK Residential Survey | https://www.rics.org/ |
| Regional HPI | Halifax / Nationwide | Quarterly releases |

## Tier 3-5 Sources (Fallback Only)

| Data Type | When to Use Tier 3+ |
|-----------|---------------------|
| Asking price | When Land Registry sold price not yet registered (6-8 week lag) |
| Sqft, floor plans | When not available from EPC Register or official sources |
| Images | When official sources don't have imagery |
| Tenure details | When Land Registry title register inaccessible |
| Days on market | When not verifiable via portal archives |
| **Price evolution history** | **When portal exposes `priceHistory[]` or `listingHistory[]` — capture on every enrich** |

**IMPORTANT: Portal Price History Must Be Captured on Enrichment**

Both Zoopla and Rightmove expose structured price change timelines on listing detail pages. The analyst **must** extract and store these at enrichment time — do not rely solely on reactive snapshots from `sync_data.js`:

| Portal | Field | What it contains |
|--------|-------|-----------------|
| Zoopla | `priceHistory[]` | Array of `{date, price, eventType, reason}` — full portal-visible price timeline |
| Zoopla | `dateFirstListed` | Portal's own first-listing ISO date (not same as your `first_seen`) |
| Rightmove | `listingHistory[].priceChangeData` | Portal-visible price changes with old/new price and date |
| Rightmove | `prices.primaryPrice` | Current asking price (string `"£765,000"`) |
| Rightmove | `prices.pricePerSqFt` | Portal-computed £/sqft (not extracted in current scraper) |

See `PROTOCOLS/08_SCRAPING.md` for extraction patterns. Price history entries must be written to `price_history` at enrichment time — never wait for the next sync cycle.

**Important:** If Tier 1 source has the data you need, do NOT fall back to Tier 3 for the same data point. Use Tier 3 only for data that Tier 1 doesn't provide.

## Research Workflow

```
1. IDENTIFY what data you need
         |
2. CHECK if Tier 1 source has it (Land Registry, ONS, BoE)
         |
3. If YES --> Fetch from Tier 1, document source + methodology
         |
4. If NO  --> Check Tier 2 for supplementary context
         |
5. If still needed --> Use Tier 3-5 portals for listing-specific data
         |
6. If Tier 3 blocked --> Use FlareSolverr (Tier 5)
         |
7. If unverifiable --> Flag as needs_enrichment, document attempt
```

## Documentation Requirements

For every data point added to `macro_trend.json` or property records:
1. Record the **source URL**
2. Record the **methodology** (how was this derived?)
3. Record the **date fetched**
4. If using Tier 3-5 fallback, note: `"fallback": true, "primary_source_unavailable_reason": "..."`

## Common Mistakes to Avoid

| Wrong | Correct |
|-------|---------|
| Use Zoopla sqft when EPC Register has it | Check EPC Register first |
| Use Rightmove price when Land Registry has sold price | Use Land Registry for completed sales |
| Scrape Halifax HPI when ONS has official index | Use ONS HPI |
| Use FlareSolverr to bypass Cloudflare on gov sites | Government sites rarely block — try direct first |
| Estimate data instead of flagging as missing | Flag `needs_enrichment` |
