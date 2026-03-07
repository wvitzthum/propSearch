# Data Fidelity Audit: [YYYY-MM-DD]

## Audit Objective
Verify the empirical accuracy, link integrity, and schema compliance of the property dataset in `data/master.json`.

## 1. Link & Image Integrity
- [ ] **Portal Links:** Randomly test 10% of links. Are they live?
- [ ] **Direct Agent Links:** Does every entry have a primary agent link if available?
- [ ] **High-Res Check:** Are `image_url` and `gallery` links direct image files (not HTML pages)?
- [ ] **Placeholder Check:** Are there any remaining `unsplash.com`, `placehold.it`, or `example.com` URLs?

## 2. Spatial & Commute Accuracy
- [ ] **Coordinate Check:** Do `lat/lng` (if present) match the `address`?
- [ ] **Commute Times:** Spot-check Paternoster/Canada Square times against Google Maps/TfL.
- [ ] **Tube Proximity:** Is `nearest_tube_distance` realistic for the given postcode?

## 3. Financial & Scoring Logic
- [ ] **Alpha Score Math:** Manually calculate the Alpha Score for 3 properties. Does it match the JSON value?
- [ ] **Running Costs:** Do `service_charge` and `ground_rent` align with area averages (e.g., £2k-£5k for prime flats)?
- [ ] **Lease Depth:** Are all leasehold properties showing >90 years?

## 4. Discovery Metadata
- [ ] **Registry Sync:** Does `first_seen` persist correctly across scrapes?
- [ ] **Discovery Count:** Is the increment logic working for repeat finds?

## Audit Findings
| ID | Property Address | Issue | Severity |
| --- | --- | --- | --- |
| | | | |

## Resolution Plan
[Document tasks created in Tasks.md to address findings]
