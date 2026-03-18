# Research Report: Floorplan Extraction (DAT-090)

## Objective
Identify and implement high-fidelity extraction of `floorplan_url` from portal JSON blobs to support spatial triage.

## Portal Analysis

### 1. Rightmove (PAGE_MODEL)
Rightmove embeds a large JSON object in the `window.jsonModel` or similar `PAGE_MODEL` script tag.
- **Path:** `floorplans` array within the model.
- **Logic:** Iterate through the `floorplans` array and extract the `url` from the first object (usually the primary floorplan).
- **Resolution:** Rightmove URLs usually support `max_1176x786.jpeg` or higher via suffix modification.

### 2. Zoopla (__NEXT_DATA__)
Zoopla uses a Next.js hydration blob.
- **Path:** `props.pageProps.listingDetails.floorplans`
- **Logic:** Locate the `floorplans` array and extract the `url`.
- **Note:** Ensure the URL is fully qualified (prefixed with `https://www.zoopla.co.uk` if relative).

## Implementation Strategy (Pseudo-code)

```javascript
/**
 * Extract floorplan URL from portal-specific JSON blobs.
 * @param {Object} blob - The raw JSON model from the portal.
 * @param {string} source - 'Rightmove' | 'Zoopla'
 * @returns {string|null} - Direct URL to the floorplan image.
 */
function extractFloorplan(blob, source) {
  try {
    if (source === 'Rightmove') {
      const plans = blob.floorplans || [];
      return plans.length > 0 ? plans[0].url : null;
    }
    
    if (source === 'Zoopla') {
      const details = blob.props?.pageProps?.listingDetails;
      const plans = details?.floorplans || [];
      return plans.length > 0 ? plans[0].url : null;
    }
  } catch (err) {
    console.error(`Extraction failed for ${source}:`, err);
  }
  return null;
}
```

## Next Steps
- [ ] Update Ingestion Prompt (`data/import/PROMPT_GUIDE.md`) to enforce this path.
- [ ] Enhance `scripts/sync_data.js` to validate `floorplan_url` presence during normalization.
