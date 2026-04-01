# FX / GBP-USD Effective Discount Citation

## Data Used
- **GBP/USD Exchange Rate:** Spot rate for international arbitrage calculations
- **Historical Volatility:** 12-month standard deviation of GBP/USD
- **Forward Projections:** 12-month GBP/USD consensus forecasts

## Source URLs
- **Bank of England FX Rates:** https://www.bankofengland.co.uk/boeapps/database/
- **ONS Trade Statistics:** https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments
- **Consensus Economics:** https://www.consensuseconomics.com/ (proprietary)

## Methodology Notes
- Spot rate: WM/Reuters 4pm London fixing
- For international buyers, effective discount = (USD_price_UK - USD_price_home_market) / USD_price_home_market
- London premium vs global markets calculated against comparable cities (NYC, Hong Kong, Singapore)

## Last Refresh
2026-03-30 (estimated - requires live data pull)
