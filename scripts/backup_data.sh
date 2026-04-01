#!/bin/bash
# propSearch Data Backup Script
# Creates timestamped snapshots of the data/ directory

set -e

BACKUP_DIR="data/backups"
DATA_DIR="data"
LOG_FILE="data/backups/LOG.md"

# Create timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_NAME="snapshot_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Create snapshot of key files
echo "Creating backup snapshot: ${BACKUP_NAME}"

# Backup database
if [ -f "${DATA_DIR}/propSearch.db" ]; then
  cp "${DATA_DIR}/propSearch.db" "${BACKUP_PATH}/"
fi

# Backup JSON files
if [ -f "${DATA_DIR}/macro_trend.json" ]; then
  cp "${DATA_DIR}/macro_trend.json" "${BACKUP_PATH}/"
fi

# Backup subdirectories
mkdir -p "${BACKUP_PATH}/inbox" "${BACKUP_PATH}/import" "${BACKUP_PATH}/triaged" "${BACKUP_PATH}/archive"

# Log to LOG.md
echo "| ${TIMESTAMP} | Manual | Pre-operation snapshot | Database, macro_trend.json | ✓ Complete |" >> "${LOG_FILE}"

echo "Backup complete: ${BACKUP_PATH}"

# Cleanup old backups (keep last 8)
cd "${BACKUP_DIR}"
ls -dt snapshot_* 2>/dev/null | tail -n +9 | xargs rm -rf 2>/dev/null || true
echo "Old backups cleaned (retained last 8)"
