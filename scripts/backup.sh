#!/usr/bin/env bash
# Daily backup: commit any changes and push to GitHub
set -euo pipefail

REPO_DIR="/home/krug3r/projects/qorpera"
LOG_FILE="/home/krug3r/projects/qorpera/scripts/backup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

cd "$REPO_DIR"

# Stage all changes (respects .gitignore)
git add -A

# Only commit if there's something to commit
if git diff --cached --quiet; then
  echo "[$TIMESTAMP] No changes to backup." >> "$LOG_FILE"
else
  git commit -m "chore: daily backup $TIMESTAMP"
  echo "[$TIMESTAMP] Committed changes." >> "$LOG_FILE"
fi

# Always push (catches commits made outside this script too)
git push origin master >> "$LOG_FILE" 2>&1
echo "[$TIMESTAMP] Pushed to GitHub." >> "$LOG_FILE"
