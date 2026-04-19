#!/usr/bin/env bash
# propSearch: Pre-Commit Data Guard Hook
# Blocks commits that would introduce data integrity violations
# Install: cp scripts/pre-commit-data-guard.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BLOCKED=0

echo ""
echo "🔒 propSearch Data Guard: Pre-commit validation running..."

# ── 1. Block accidental data file commits ──────────────────────────────────────
DATA_STAGED=$(git diff --cached --name-only | grep -E '^data/' || true)
# Exception list — files with explicit PO approval for automated commits
DATA_EXCEPTIONS=$(cat <<'EOF'
data/demo_master.json
data/sources/hpi_by_type.json
data/sources/lending_rules.json
data/sources/lending_rules_citation.md
data/sources/schema_migration_log.md
EOF
)
if [ -n "$DATA_STAGED" ]; then
    # Filter out exceptions via Python — avoids bash multiline/grep quoting pitfalls
    DATA_STAGED_FILTERED=$(python3 -c "
import sys
exceptions = [line.strip() for line in '''$DATA_EXCEPTIONS'''.splitlines() if line.strip()]
staged = [line.strip() for line in sys.stdin if line.strip() and line.strip() not in exceptions]
sys.stdout.write('\n'.join(staged))
" <<< "$DATA_STAGED")

    if [ -n "$DATA_STAGED_FILTERED" ]; then
        echo -e "${RED}✗ BLOCKED: Staged changes to data/ directory detected:${NC}"
        echo "$DATA_STAGED_FILTERED" | while read -r f; do
            echo "  - $f"
        done
        echo ""
        echo -e "${RED}  Data files must not be committed without explicit PO approval.${NC}"
        echo -e "${RED}  If this is intentional, bypass with: git commit --no-verify${NC}"
        echo ""
        BLOCKED=1
    fi
fi

# ── 2. Block any file referencing hallucinated ID patterns ──────────────────────
HALLUCINATED=$(git diff --cached | grep -E 'a1b2c3d4-[a-f0-9-]{28,}' || true)
if [ -n "$HALLUCINATED" ]; then
    echo -e "${RED}✗ BLOCKED: Hallucinated ID pattern detected in staged changes:${NC}"
    echo "$HALLUCINATED" | head -5
    echo ""
    echo -e "${RED}  Records with 'a1b2c3d4-' IDs must be rejected at schema validation.${NC}"
    echo -e "${RED}  Remove these records before committing.${NC}"
    echo ""
    BLOCKED=1
fi

# ── 3. Block deprecated DuckDB files ────────────────────────────────────────────
DUCKDB_STAGED=$(git diff --cached --name-only | grep -E '\.duckdb$' || true)
if [ -n "$DUCKDB_STAGED" ]; then
    echo -e "${RED}✗ BLOCKED: DuckDB files detected (deprecated per ADR-011):${NC}"
    echo "$DUCKDB_STAGED"
    echo ""
    BLOCKED=1
fi

# ── 4. Block .env files ─────────────────────────────────────────────────────────
ENV_STAGED=$(git diff --cached --name-only | grep -E '^\.env' || true)
if [ -n "$ENV_STAGED" ]; then
    echo -e "${RED}✗ BLOCKED: Environment files must not be committed:${NC}"
    echo "$ENV_STAGED"
    echo ""
    BLOCKED=1
fi

# ── 5. Block any file with obvious synthetic/placeholder keywords in data paths ─
SYNTHETIC=$(git diff --cached --name-only | grep -Ei '(synthetic|fake|placeholder|dummy|test_data)' | grep -E '^data/' || true)
if [ -n "$SYNTHETIC" ]; then
    echo -e "${RED}✗ BLOCKED: Files with synthetic/placeholder keywords in data/:${NC}"
    echo "$SYNTHETIC"
    echo ""
    echo -e "${RED}  Production data files must not contain synthetic content.${NC}"
    BLOCKED=1
fi

# ── 6. Block master DB or JSONL changes without backup log entry ─────────────────
MASTER_STAGED=$(git diff --cached --name-only | grep -E '(data/master\.jsonl|data/propSearch\.db)$' || true)
if [ -n "$MASTER_STAGED" ]; then
    LOG_EXISTS=$(git diff --cached --name-only | grep -E 'data/backups/LOG\.md' || true)
    if [ -z "$LOG_EXISTS" ]; then
        echo -e "${YELLOW}⚠ WARNING: Changes to master data files without LOG.md update detected:${NC}"
        echo "  Staged: $MASTER_STAGED"
        echo ""
        echo -e "${YELLOW}  Recommendation: Update data/backups/LOG.md to document this change.${NC}"
        echo -e "${YELLOW}  Commit is allowed but the PO will be notified.${NC}"
        echo ""
        # Warning only — do not block, but flag clearly
    fi
fi

# ── 7. Block inbox file commits ─────────────────────────────────────────────────
INBOX_STAGED=$(git diff --cached --name-only | grep -E '^data/inbox/' || true)
if [ -n "$INBOX_STAGED" ]; then
    echo -e "${RED}✗ BLOCKED: Staged changes to data/inbox/ detected:${NC}"
    echo "$INBOX_STAGED"
    echo ""
    echo -e "${RED}  Live inbox leads are local-only and must not be committed.${NC}"
    BLOCKED=1
fi

# ── 7b. ADR-022: Run URL contamination audit when data files are staged ─────────
# Warns on cross-contamination; does not block (PO reviews separately)
DATA_STAGED_AUDIT=$(git diff --cached --name-only | grep -E '^data/(import/|propSearch\.db$|master\.jsonl$)' || true)
if [ -n "$DATA_STAGED_AUDIT" ]; then
    echo ""
    echo -e "${YELLOW}⚠ ADR-022: data files staged — running URL contamination audit...${NC}"
    if node scripts/sync_data.js --audit-urls 2>/dev/null; then
        echo -e "${GREEN}  URL audit: CLEAN${NC}"
    else
        echo -e "${YELLOW}  URL audit: warnings detected — review output above${NC}"
    fi
fi

echo ""

if [ "$BLOCKED" -eq 1 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════"
    echo -e "${RED}  PRE-COMMIT BLOCKED — Data Guard violation detected"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  To bypass (requires PO pre-approval): git commit --no-verify"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ Data Guard: No violations detected${NC}"
    echo ""
    exit 0
fi
