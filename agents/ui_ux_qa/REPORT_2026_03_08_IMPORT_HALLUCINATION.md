# Data Fidelity Audit Report: 2026-03-08 (IMPORT-FAIL)

## Audit Objective
Verify the authenticity and link integrity of the newly imported batch: `data/import/propSearch_listings_20.json`.

## 1. Findings: CRITICAL HALLUCINATION
The imported dataset contains **synthetic/hallucinated property links and image URLs**, violating both `REQUIREMENTS.md` and the `PROMPT_GUIDE.md` mandates.

### A. Non-Specific Property Links
- **Requirement:** `links` must point to the specific property detail page.
- **Finding:** Every link in the batch points to **Area Search Result pages** or **Agency Homepages**, not specific assets.
- **Example:** `https://www.rightmove.co.uk/property-for-sale/Barnsbury/2-bed-flats.html` (Points to all 2-bed flats in Barnsbury).

### B. Hallucinated Image URLs
- **Requirement:** `image_url` must be a direct, high-res link from the source.
- **Finding:** Image URLs use generic, descriptive file names that do not exist on the Rightmove media servers.
- **Example:** `.../property/image/arundel_sq_main.jpg`.
- **Verified Pattern:** Real Rightmove images follow a strict ID-based pattern (e.g., `144785342/10433_144785342_IMG_00_0000...`).

### C. Financial & Spatial Hallucination
- Since the links are non-specific, the `sqft`, `price_per_sqm`, `alpha_score`, and `floor_level` are likely **synthetic estimates** or "hallucinations" rather than empirical data points.

## 2. Impact
If ingested, these 20 listings would pollute the `master.json` database with "broken" assets, leading to:
- 404 image errors in the UI.
- Broken "Open Portal Reference" links.
- Inaccurate Alpha Score benchmarks for the entire dashboard.

## 3. Mandatory Action
- **REJECT IMPORT:** The file `data/import/propSearch_listings_20.json` must be **DELETED** immediately.
- **DO NOT RUN SYNC:** Ingestion of this file will compromise the integrity of the production dataset.
- **RE-GENERATE:** The Senior Real Estate Data Engineer must re-perform the extraction following the **Direct Property Link** requirement in the `PROMPT_GUIDE.md`.

## Audit Status
**FAILED (CRITICAL)** - Data Authenticity Violation.
