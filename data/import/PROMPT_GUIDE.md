# External Agent Data Prompting Guide

## Purpose
This document provides instructions for external agents (e.g., GPT, Claude, or third-party scrapers) to format property leads for ingestion into the **immoSearch** ecosystem.

## How to Prompt an External Agent
"I am looking for prime London properties in Islington (N1/N7), Bayswater (W2), Belsize Park (NW3), and West Hampstead (NW6) between £600k and £775k. Please find listings and provide them as a JSON array following this exact schema:

```json
[
  {
    "address": "Full property address",
    "area": "Islington (N1) | Islington (N7) | Bayswater (W2) | Belsize Park (NW3) | West Hampstead (NW6)",
    "list_price": 685000,
    "sqft": 750,
    "epc": "B",
    "tenure": "Leasehold (105 yrs)",
    "service_charge": 2200,
    "ground_rent": 150,
    "lease_years_remaining": 105,
    "links": ["https://..."],
    "image_url": "https://...",
    "source_name": "Optional: e.g., 'Savills Search' or 'Claude Research'"
  }
]
```
Ensure all numbers are integers and strings follow the exact area options. Do not include synthetic data."

## Ingestion Workflow
1.  **Drop Zone:** Save the generated JSON file into `/workspaces/immoSearch/data/import/`.
2.  **Naming:** Use a descriptive name like `batch_01_research.json`.
3.  **Processing:** The immoSearch Data Agent will automatically pick up, normalize, and calculate Alpha Scores for these leads on its next activation cycle.
