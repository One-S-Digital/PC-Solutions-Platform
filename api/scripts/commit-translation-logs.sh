#!/bin/bash

# Script to commit translation error logs to git
# This script should be run periodically to commit log files

LOG_DIR="/workspace/api/logs/translation-errors"
GIT_DIR="/workspace"

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo "Log directory does not exist: $LOG_DIR"
    exit 1
fi

# Check if there are any log files
if [ -z "$(ls -A $LOG_DIR 2>/dev/null)" ]; then
    echo "No log files found in $LOG_DIR"
    exit 0
fi

# Navigate to git directory
cd "$GIT_DIR" || exit 1

# Add all log files
git add api/logs/translation-errors/

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "No new translation log files to commit"
    exit 0
fi

# Commit the log files
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "feat: add translation error logs - $TIMESTAMP

## Translation Error Logs Added:
- Individual error log files
- Daily summary logs  
- Master error summary
- Error counts by language, page, and severity
- Recent errors tracking

These logs help identify and fix translation issues systematically."

echo "Translation error logs committed successfully"