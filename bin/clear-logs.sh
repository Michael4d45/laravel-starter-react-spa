#!/usr/bin/env bash

set -euo pipefail

FILES_TO_CLEAR=(
    "storage/logs/laravel.log"
    "storage/logs/sql.log"
    "storage/logs/browser.log"
    "storage/logs/swoole_http.log"
)

echo "Clearing contents of specified files..."

for file in "${FILES_TO_CLEAR[@]}"; do
    if [ -f "$file" ]; then
        : > "$file"
        echo "Emptied $file"
    fi
done

echo "Done."