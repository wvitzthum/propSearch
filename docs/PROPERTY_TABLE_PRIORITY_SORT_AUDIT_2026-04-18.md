
PROPERTY TABLE PRIORITY SORT — BUG AUDIT
========================================
Files: frontend/src/pages/PropertiesPage.tsx
       frontend/src/components/PropertyTable.tsx
Date: 2026-04-18
Auditor: ui_ux_qa

SUMMARY
-------
The "Order by Priority" (user_priority) column sort is broken due to two
independent bugs that prevent ranked properties from appearing correctly
when the sort is active. The root cause is a disconnect between the
PropertyTable's local sort state and the PropertiesPage's URL filter state.

BUG #1 — sortOrder not synced on column switch (CRITICAL)
---------------------------------------------------------
Location: PropertiesPage.tsx line 662

  onSortChange={key => updateFilters({ sortBy: key as string })}
                                                ^^^^^^^^^^^^^^^
  ONLY updates sortBy — sortOrder is NEVER changed.

Effect:
  1. User has sorted by alpha_score DESC (default for that column).
     filters = { sortBy: 'alpha_score', sortOrder: 'DESC' }
     filteredProperties sorted DESC by alpha_score ✓

  2. User clicks "Priority" column header.
     → PropertyTable toggles localSort to { key: 'user_priority', direction: 'asc' }
     → onSortChange('user_priority') fires
     → updateFilters({ sortBy: 'user_priority' })  ← sortOrder NOT updated!
     → filters = { sortBy: 'user_priority', sortOrder: 'DESC' }
     ← STILL DESC!

  3. filteredProperties computes:
       dir = filters.sortOrder === 'ASC' ? 1 : -1  // = -1 (DESC)
       ...
       case 'user_priority':
         return (rankA - rankB) * dir;  // (rankA - rankB) * -1
                                          // rank 1 → rank 1 * -1 = -1
                                          // rank 2 → rank 2 * -1 = -2
                                          // unranked → -dir = +1

     DESC sort of ASC values: highest rank number at TOP (rank 10 above rank 1)
     But rank 1 should ALWAYS be the highest priority (at top).

  The correct behavior for user_priority: ranks should ALWAYS sort ASC
  (rank 1 first, rank 10 last), regardless of any "direction" concept.
  The user clicking "Priority" expects rank 1 at the top immediately.

Fix: Update onSortChange to set sortOrder correctly:
  onSortChange={key => {
    const dir = key === 'user_priority' ? 'ASC' : 'DESC';
    updateFilters({ sortBy: key, sortOrder: dir });
  }}

BUG #2 — localSort direction diverges from filteredProperties sortOrder (MEDIUM)
-----------------------------------------------------------------------------
Location: PropertyTable.tsx line 107–110

  const [localSort, setLocalSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: currentSort || 'alpha_score',
    direction: 'desc'   ← HARDCODED, ignores filters.sortOrder
  });

Effect:
  1. PropertiesPage defaults to { sortBy: 'alpha_score', sortOrder: 'ASC' }
  2. PropertyTable initializes localSort.direction = 'desc' (hardcoded)
  3. PropertyTable DISPLAYS 'desc' sort arrow even though data is 'ASC'
  4. User sees: alpha_score sorted DESC in table, but actual data is ASC

  This is the "mixed sorting" the user observed — the sort ARROW in the
  table header doesn't match the actual data order.

  This bug is more subtle and depends on the default sortOrder.
  It may be intermittent depending on what sortOrder was last set.

Fix: Initialize localSort.direction from filters.sortOrder:
  const [localSort, setLocalSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: currentSort || 'alpha_score',
    direction: (filters.sortOrder === 'ASC' ? 'asc' : 'desc')
  });

Or better: have PropertiesPage own ALL sort state and pass the current
direction down so PropertyTable never diverges.

DESIGN OBSERVATION — user_priority should not have a direction concept at all
------------------------------------------------------------------------------
The ranked properties sort (user_priority) should ALWAYS be ascending:
  rank 1 > rank 2 > rank 3 > ... > unranked

There is no meaningful "DESC" interpretation of ranks. Ranks are ordinal
— reversing them (rank 10 before rank 1) makes no sense from a UX standpoint.
The keyboard shortcut in PropertiesPage (lines 277-280) already understands this:
  if (filters.sortBy === 'user_priority') {
    updateFilters({ sortBy: 'alpha_score', sortOrder: 'DESC' });
  } else {
    updateFilters({ sortBy: 'user_priority', sortOrder: 'ASC' });
  }

This should be the pattern everywhere user_priority sort is handled.

REGRESSION RISK
---------------
Any future code that calls updateFilters with sortBy but not sortOrder
will reintroduce this bug. The fix should include:
  1. Explicit sortOrder in onSortChange (immediate fix)
  2. DEFAULT_SORT_ORDERS map so new sort keys have predictable defaults
  3. Unit test covering the sort transition from alpha_score → user_priority
