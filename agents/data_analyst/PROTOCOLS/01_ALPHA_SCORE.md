# Alpha Score Calculation Protocol
*Reference from: agents/data_analyst/README.md — section "Logic & Calculations"*

## Alpha Score (0-10 Scale)

A weighted score representing the acquisition quality of a property.

### Formula Components

| Component | Weight | Calculation |
|-----------|--------|-------------|
| **Tenure Quality** | 40% | Share of Freehold = 10, Long Lease (>150yrs) = 10, Lease (>125yrs) = 8, Lease (>90yrs) = 7 |
| **Spatial Alpha** | 30% | Tube: <300m = 7, <500m = 5, <800m = 3. Parks: <400m = 3, <800m = 1 |
| **Price Efficiency** | 30% | 0% discount vs area benchmark = 5.0; 25% discount = 10.0 |

### Price Efficiency Calculation
```
price_efficiency = 5 + (area_discount_pct / 25) × 5
```
Where `area_discount_pct = (benchmark_psqm − property_psqm) / benchmark_psqm × 100`

### Floorplan Extraction
- **Rightmove:** Isolate from `floorplans` array in `PAGE_MODEL`.
- **Zoopla:** Isolate from `listingDetails.floorplans` in `__NEXT_DATA__`.
- Refer to `RESEARCH_FLOORPLAN_EXTRACTION.md` for implementation details.

### Future Appreciation Potential (0-10 Scale)
Based on: Area Momentum, Transport Connectivity, Asset Quality, Value Gap.

### When to Recalculate
- When `sqft` is updated with a measured value (from floorplan or EPC)
- When `nearest_tube_distance` or `park_proximity` is updated
- When `realistic_price` changes significantly
- Always document the basis for changes in `analyst_notes`
