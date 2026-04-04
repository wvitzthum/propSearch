# Property Lead Capture Guide
## propSearch Inbox -- Market Scout Protocol

**For:** External Data Analyst Agent
**Last Updated:** 2026-04-03
**Scope:** 81 properties tracked (19 active, 62 archived)

---

## Strategic Objective

Identify **[NUMBER]** unique, live property listings that match the acquisition criteria.
All leads are routed to the **Inbox** for human triage before full normalization.

> **CRITICAL:** Before submitting any leads, cross-reference against the **Exclusion List** in Section 5.
> Duplicate entries are rejected at import but waste analyst tokens.

---

## 1. Acquisition Criteria

### Target Postcodes

| Area | Postcodes | Priority |
|------|-----------|----------|
| Islington | N1, N7 | Primary |
| Bayswater | W2 | Primary |
| Belsize Park | NW3 | Primary |
| West Hampstead | NW6 | Secondary |
| Chelsea | SW3, SW10 | Secondary |

### Price Range

**GBP 500,000 - GBP 775,000** (strict bounds -- no exceptions)

### Property Specification

| Attribute | Requirement |
|-----------|-------------|
| Bedrooms | 1.5 to 2 (accept 2 as max) |
| Property Type | Flat / Apartment only |
| Minimum Size | 600 sq ft (56 sqm) |
| Tenure (Priority Order) | 1. Share of Freehold, 2. Leasehold >90 years remaining |

### Tenure Decision Matrix

| Tenure | Action |
|--------|--------|
| Share of Freehold | Include |
| Leasehold >90 years remaining | Include |
| Leasehold 80-90 years | Flag -- include only if exceptional alpha |
| Leasehold <80 years | Hard exclusion |
| Freehold (house) | Hard exclusion -- flat/apartment only |

---

## 2. Hard Exclusions

Skip immediately without flagging:

- Student accommodation
- Retirement / sheltered housing
- Auction listings
- Status: "Sold STC", "Let Agreed", "Sold", "Under Offer"
- Commercial or mixed-use properties
- Rental listings (reject if URL contains /to-rent/ or price shows pcm/pw)
- New-build only developments (consultant flats, build-to-rent)
- Listings with annual service charge >GBP 10,000

---

## 3. Required Data Points

### Mandatory Fields

| Field | Source | Example |
|-------|--------|---------|
| address | Listing | 14 Belsize Avenue, NW3 |
| price | Asking price (number, no GBP symbol) | 685000 |
| area | Area + postcode | Belsize Park (NW3) |
| url | Direct listing URL | https://www.rightmove.co.uk/... |
| source | Portal or agent | Rightmove / Winkworth |
| tenure | Listed tenure | Share of Freehold or Leasehold (105 yrs) |
| service_charge | Annual (number) | 2500 or null |
| ground_rent | Annual (number) | 150 or null |

### Preferred Fields (include if available)

| Field | Example |
|-------|---------|
| sqft | 847 |
| bedrooms | 2 |
| epc_rating | C |
| floor_level | 2nd, Ground, Lower Ground, 4th (Lift) |
| image_url | Hero image URL |
| list_date | Date first listed |
| price_reduction | Any price reduction amount |

---

## 4. JSON Output Schema

Return a **single JSON array** in compact format (no pretty-printing, no markdown fences).

```json
[{"address":"string","price":number,"area":"string","url":"uri","source":"string","tenure":"string","service_charge":number|null,"ground_rent":number|null,"sqft":number|null,"bedrooms":number|null,"epc_rating":"string|null","floor_level":"string|null","image_url":"uri|null","list_date":"string|null","price_reduction":number|null}]
```

> Return raw JSON only. No markdown fences. No preamble. No commentary.

---

## 5. DEDUPLICATION SYSTEM

**ALWAYS check Level 1 first (URL match is 100% certain).**

### LEVEL 1: URL Exact Match -- SKIP IMMEDIATELY

If listing URL matches ANY of these, **SKIP IMMEDIATELY**.

**63 tracked URLs:**

```
  https://goldschmidtandhowland.co.uk/
  https://jitty.com/properties/Sfp81MUuxILmdhUrNdWN
  https://jitty.com/properties/zDKbYC9ad4jbSeYMEv8Z
  https://www.chancellors.co.uk/property/northways-college-crescent-nw3/
  https://www.ellisandco.co.uk/property-for-sale/?area=islington
  https://www.foxtons.co.uk/properties-for-sale/w2/hatherley-grove-chpk0345850
  https://www.hotblackdesiato.co.uk/property/dibden-street-islington-n1-2/
  https://www.kfh.co.uk/north-london/islington/flats-for-sale/2292228/
  https://www.kfh.co.uk/property-for-sale/2-bedroom-apartment-for-sale-in-wenlock-road-islington-london-n1-9311/
  https://www.knightfrank.co.uk/properties/residential/for-sale/belsize-avenue-london-nw3/BelsizeAvenue
  https://www.mylondonhome.com/properties/blackthorn-avenue-islington-n7-8ah
  https://www.onthemarket.com/details/18674956/
  https://www.primelocation.com/for-sale/details/57767539/
  https://www.rightmove.co.uk/properties/144785342
  https://www.rightmove.co.uk/properties/145107342
  https://www.rightmove.co.uk/properties/146669591
  https://www.rightmove.co.uk/properties/148496943
  https://www.rightmove.co.uk/properties/156060572
  https://www.rightmove.co.uk/properties/171386933
  https://www.rightmove.co.uk/properties/172342250
  https://www.winkworth.co.uk/properties/sales/hillmarton-road-islington-london-n7/12711096/
  https://www.zoopla.co.uk/for-sale/details/61072177/
  https://www.zoopla.co.uk/for-sale/details/67080224/
  https://www.zoopla.co.uk/for-sale/details/68090936/
  https://www.zoopla.co.uk/for-sale/details/70134110/
  https://www.zoopla.co.uk/for-sale/details/70438237/
  https://www.zoopla.co.uk/for-sale/details/70635746/
  https://www.zoopla.co.uk/for-sale/details/71200883/
  https://www.zoopla.co.uk/for-sale/details/71322628/
  https://www.zoopla.co.uk/for-sale/details/71383812/
  https://www.zoopla.co.uk/for-sale/details/71497942/
  https://www.zoopla.co.uk/for-sale/details/71650400/
  https://www.zoopla.co.uk/for-sale/details/71733465/
  https://www.zoopla.co.uk/for-sale/details/71841123/
  https://www.zoopla.co.uk/for-sale/details/71918591/
  https://www.zoopla.co.uk/for-sale/details/71985792/
  https://www.zoopla.co.uk/for-sale/details/72045386/
  https://www.zoopla.co.uk/for-sale/details/72257420/
  https://www.zoopla.co.uk/for-sale/details/72265957/
  https://www.zoopla.co.uk/for-sale/details/72494410/
  https://www.zoopla.co.uk/for-sale/details/72495505/
  https://www.zoopla.co.uk/for-sale/details/72498302/
  https://www.zoopla.co.uk/for-sale/details/72516087/
  https://www.zoopla.co.uk/for-sale/details/72527477/
  https://www.zoopla.co.uk/for-sale/details/72537410/
  https://www.zoopla.co.uk/for-sale/details/72543070/
  https://www.zoopla.co.uk/for-sale/details/72556280/
  https://www.zoopla.co.uk/for-sale/details/72563501/
  https://www.zoopla.co.uk/for-sale/details/72565150/
  https://www.zoopla.co.uk/for-sale/details/72565797/
  https://www.zoopla.co.uk/for-sale/details/72566261/
  https://www.zoopla.co.uk/for-sale/details/72571111/
  https://www.zoopla.co.uk/for-sale/details/72590494/
  https://www.zoopla.co.uk/for-sale/details/72600488/
  https://www.zoopla.co.uk/for-sale/details/72607915/
  https://www.zoopla.co.uk/for-sale/details/72706165/
  https://www.zoopla.co.uk/for-sale/details/72721308/
  https://www.zoopla.co.uk/for-sale/details/72722295/
  https://www.zoopla.co.uk/for-sale/details/72736152/
  https://www.zoopla.co.uk/for-sale/details/72740457/
  https://www.zoopla.co.uk/for-sale/details/72751790/
  https://www.zoopla.co.uk/for-sale/details/72758695/
  https://www.zoopla.co.uk/for-sale/details/72823414/
```

### LEVEL 2: Address Normalization -- SKIP OR FLAG

**Normalize before comparing:**
1. Remove: flat/unit/apartment numbers, floor numbers, suffixes (st, nd, rd, th)
2. Lowercase and remove punctuation
3. Compare: `street_name + area_postcode`

**Examples:**

| Raw Listing | Normalized | Match? |
|-------------|------------|--------|
| "Flat 1, 14 Belsize Lane, NW3" | "14 belsize lane nw3" | YES |
| "2nd Floor, 14 Belsize Lane" | "14 belsize lane" | YES |
| "14 Belsize Lane, Flat A" | "14 belsize lane" | YES |

### LEVEL 3: Active Properties by Postcode -- FLAG SAME ROAD

Properties on these roads are already tracked. **Flag for review** if same street + same area.

**N1 (5 properties):**
| Address | Price | Status |
|---------|-------|--------|
| Alwyne Road, Canonbury, London N1 | GBP 695,000 | discovered |
| Danbury Street, Angel, Islington, London, N1 | GBP 685,000 | discovered |
| Highbury New Park, London N5 | GBP 675,000 | discovered |
| Southgate Road, Islington, London N1 | GBP 550,000 | discovered |
| Spenlow Apartments, Wenlock Road, Islington, London, N1 | GBP 745,000 | discovered |

**NW1 (1 properties):**
| Address | Price | Status |
|---------|-------|--------|
| Princess Road, Primrose Hill, London | GBP 650,000 | discovered |

**NW3 (5 properties):**
| Address | Price | Status |
|---------|-------|--------|
| Belsize Lane, Belsize Park NW3 | GBP 715,000 | discovered |
| Belsize Park Gardens, London NW3 | GBP 745,000 | discovered |
| Crossfield Road, London NW3 | GBP 750,000 | discovered |
| Haverstock Hill, London NW3 | GBP 669,950 | discovered |
| Northways, College Crescent | GBP 760,000 | discovered |

**NW6 (3 properties):**
| Address | Price | Status |
|---------|-------|--------|
| Cavendish Mansions, Mill Lane, West Hampstead, London, NW6 1JY | GBP 599,950 | discovered |
| Finchley Road, West Hampstead NW3 | GBP 750,000 | discovered |
| Goldhurst Terrace, South Hampstead NW6 | GBP 595,000 | discovered |

**NW8 (1 properties):**
| Address | Price | Status |
|---------|-------|--------|
| St. Johns Wood Road, London NW8 | GBP 684,995 | discovered |

**SW7 (1 properties):**
| Address | Price | Status |
|---------|-------|--------|
| Gloucester Road, Knightsbridge, London | GBP 700,000 | discovered |

**W2 (3 properties):**
| Address | Price | Status |
|---------|-------|--------|
| Lower Ground Floor, Gloucester Terrace, Bayswater, London, W2 3DG | GBP 740,000 | discovered |
| Peters Court, Porchester Road, Bayswater, London, W2 5DP | GBP 650,000 | discovered |
| Ralph Court, Queensway, London W2 | GBP 750,000 | discovered |

### LEVEL 4: Price + Area Suspicious Match -- FLAG

**Flag for review** if ALL three:
- Same postcode (N1, NW3, etc.)
- Price within GBP 10,000 of tracked property
- Similar address pattern (same street name)

### LEVEL 5: Archived Property Re-List -- FLAG AS OPPORTUNITY

**62 archived properties** may be re-listed. Flag for human review.
- Price change may indicate opportunity
- Archive reason may have changed (e.g., no FoH → now SoF)

---

## 6. Execution Guidelines

### Source Priority

1. Rightmove -- highest volume, best data quality
2. Zoopla -- good for agent descriptions and floor plans
3. OnTheMarket -- sometimes has exclusive listings
4. Jitty -- useful for cross-referencing agent-only listings
5. Direct agents -- Knight Frank, Savills, Chestertons (Belsize/NW3 focus)

### Live Verification

- Only capture listings with status: For Sale / Available
- Reject: Sold, Under Offer, Let Agreed, Withdrawn
- Flag stale listings (>30 days without update)

### Data Integrity

| Rule | Enforcement |
|------|-------------|
| Never hallucinate | If field absent, use null |
| Price precision | Use exact asking price, not rounded |
| URL validity | Must be clickable live link |
| Freshness | Reject listings >90 days old unless price-reduced |

---

## 7. Special Cases

### Price-Reduced Listings

Include even if slightly outside price range (up to GBP 800,000) if:
- Original price was within range
- Reduction >5%
- Property otherwise meets criteria

### Off-Market / Agent-Direct

- Include if contact details available
- Flag source as "Agent-direct" or agent name
- May need FlareSolverr for details

### Chain-Free / No Chain

Include prominently -- positive signal for acquisition thesis.

---

## 8. Submission Format

```
LEAD_SUBMISSION_START
[compact JSON array here]
LEAD_SUBMISSION_END

Total leads: [N]
New to system: [N]
Flagged for review: [N]
Excluded (duplicate): [N]

DEDUP VERIFICATION:
- URLs checked vs Level 1: [N] matches skipped
- Addresses normalized: [N] matches found
- Same-road checks: [N] flagged
```
