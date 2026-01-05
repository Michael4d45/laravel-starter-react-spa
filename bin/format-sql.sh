#!/bin/bash

# this script requires jq, pg_format, and pygmentize to be installed
# Check if dependencies are installed
if ! command -v jq &>/dev/null; then
    echo "jq is not installed; please install it before running this script"
    exit 1
fi
if ! command -v pg_format &>/dev/null; then
    echo "pg_format is not installed; please install it before running this script"
    exit 1
fi
if ! command -v pygmentize &>/dev/null; then
    echo "pygmentize is not installed; please install it before running this script"
    exit 1
fi

log_file="$1"

if [ -z "$log_file" ]; then
    echo "No log file provided; using the default Laravel log file"
    log_file="storage/logs/laravel.log"
fi

if [ ! -f "$log_file" ]; then
    echo "The log file does not exist: '$log_file'"
    exit 1
fi

# Maximum log file size in bytes (5MB)
max_size=5242880

echo "Monitoring SQL queries in the log file: '$log_file'"

# Function to format SQL queries and apply syntax highlighting
format_sql() {
    # Concatenate all SQL queries into a single string
    sql_queries=$(printf "%s\n" "$@")

    # Format and highlight SQL queries
    formatted_sql=$(echo "$sql_queries" | pg_format -N -)
    echo "$formatted_sql" | pygmentize -l sql -O style=monokai

    echo "----------------------------------------"
}

# Store the initial size of the log file
last_size=$(wc -c <"$log_file")
echo "Initial file size: $last_size bytes"

# Main loop
while true; do
    # Get new lines added to the log file
    new_size=$(wc -c <"$log_file")

    # Check if file is too large
    if [ "$new_size" -gt "$max_size" ]; then
        echo "Log file too large ($new_size bytes), removing half the lines..."
        total_lines=$(wc -l < "$log_file")
        half=$((total_lines / 2))
        tail -n $half "$log_file" > "$log_file.tmp" && mv "$log_file.tmp" "$log_file"
        last_size=$(wc -c <"$log_file")
        sleep 2
        continue
    fi

    new_bytes=$((new_size - last_size))

    if [ "$new_bytes" -ne 0 ]; then
        # Extract SQL queries from new lines and batch them for processing
        new_lines=$(tail -c +$((last_size + 1)) "$log_file" | jq -r '.context.SQL')

        # Format and highlight SQL queries
        if [ -n "$new_lines" ]; then
            format_sql "$new_lines"
        fi

        last_size=$new_size
    fi

    # Wait for new lines to be added
    sleep 2
done