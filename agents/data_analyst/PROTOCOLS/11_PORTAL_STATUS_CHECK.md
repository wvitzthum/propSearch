# Portal Status Verification Protocol
*Agent: Senior Real Estate Data Analyst*

Effective: 2026-04-26

## Purpose

When checking if properties are still active on portals (Rightmove, Zoopla, OnTheMarket, etc.), use the correct detection method to avoid false positives.

## Common Pitfall: False Positives from Text Matching

**WRONG METHOD:** Grepping for "sold" or "withdrawn" text anywhere in the page content.
- Portal pages contain "sold house prices" links and other navigation text
- This causes false positives where active listings appear as "sold"

**RIGHT METHOD:** Look for the specific "property removed" message that appears when a listing is no longer available.

## Detection Methods by Portal

### Rightmove

```bash
# Fetch the listing page
curl -s "https://www.rightmove.co.uk/properties/$ID" \
  -H "User-Agent: Mozilla/5.0" > page.html

# Check for REMOVED indicator
if grep -qi "This property has been" page.html; then
  echo "REMOVED/SOLD"
elif grep -q "itemType.*Residence" page.html; then
  echo "ACTIVE"
else
  echo "UNKNOWN"
fi
```

**Key indicator:** The exact phrase `"This property has been"` followed by "removed" indicates the listing is no longer available.

**Note:** The word "sold" appears in navigation links on ALL pages (e.g., "Sold house prices" in the header). Do NOT use this as a status indicator.

### OnTheMarket

```bash
curl -s "https://www.onthemarket.com/details/$ID/" \
  -H "User-Agent: Mozilla/5.0" > page.html

# Check status from dataLayer
status=$(grep -oP '"status":"[^"]+"' page.html | head -1 | cut -d'"' -f4)
echo "Status: $status"

# Valid statuses: "live", "sold", "under_offer", "withdrawn", "retracted"
```

**Valid status values:**
- `live` — actively listed
- `sold` — sold
- `under_offer` — offer accepted
- `withdrawn` — removed by agent
- `retracted` — removed/delisted

### Zoopla

Zoopla requires JavaScript rendering (FlareSolverr recommended):

```bash
# Via FlareSolverr
echo '{"cmd":"request.get","url":"https://www.zoopla.co.uk/for-sale/details/$ID/","maxTimeout":90000}' | \
  curl -s -X POST http://nas.home:8191/v1 -d @- | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['solution']['status'])"

# Or check for "listing removed" text
if grep -qi "removed\|not found\|no longer available" page.html; then
  echo "REMOVED"
fi
```

## Workflow: Property Status Check

1. **Fetch the listing page** with curl using a standard User-Agent header
2. **Apply portal-specific detection** (see above)
3. **Do NOT** use generic text searches for "sold/withdrawn"
4. **Record** the detected status and update accordingly

## When to Archive

| Detected Status | Action |
|-----------------|--------|
| Rightmove: "This property has been" present | Archive with `archive_reason = "Removed from Rightmove - property sold or delisted"` |
| OTM: status = "sold", "withdrawn", "retracted" | Archive with `archive_reason = "Removed from OnTheMarket"` |
| Zoopla: listing not found/removed | Archive with `archive_reason = "Removed from Zoopla"` |

## After Archiving

1. Update `list_price` to final listed price (if different from DB)
2. Add entry to `price_history` table with `status = 'sold'` and source = 'portal_verification'
3. Update `market_status = 'unknown'`
4. Append note to `analyst_notes` with verification date and final price

## Example: Proper Archive Workflow

```bash
# 1. Fetch and check
result=$(curl -s "https://www.rightmove.co.uk/properties/123456" -H "User-Agent: Mozilla/5.0")
if echo "$result" | grep -qi "This property has been"; then
  # 2. Find property in DB
  prop_id=$(node -e "const db = require('better-sqlite3')('data/propSearch.db'); \
    console.log(db.prepare(\"SELECT id FROM properties WHERE links LIKE '%123456%'\").get()?.id)")
  
  # 3. Add price history
  node -e "const db = require('better-sqlite3')('data/propSearch.db'); \
    db.prepare('INSERT INTO price_history (property_id, price, date, status, source) VALUES (?, ?, ?, ?, ?)') \
      .run('$prop_id', 750000, new Date().toISOString().split('T')[0], 'sold', 'rightmove_verification')"
  
  # 4. Archive
  node -e "const db = require('better-sqlite3')('data/propSearch.db'); \
    db.prepare(\"UPDATE properties SET archived=1, archive_reason='Removed from Rightmove', \
      market_status='unknown', analyst_notes=analyst_notes||' | 2026-04-26: Verified removed. Final: £750k.' WHERE id='$prop_id'\").run()"
fi
```

## Key Reminders

- ❌ **DON'T** grep for "sold" on Rightmove pages — it's in navigation on all pages
- ❌ **DON'T** assume "exchange", "completed" in footer = sold status
- ✅ **DO** look for "This property has been removed" on Rightmove
- ✅ **DO** check the `status` field in OnTheMarket's dataLayer
- ✅ **DO** use FlareSolverr for Zoopla (requires JS rendering)

Updated: 2026-04-26 (DAT-ANALYST)
