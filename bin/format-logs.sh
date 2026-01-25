#!/bin/bash

# Laravel Log Formatter - enhanced version of format-sql.sh for JSON logs
# Dependencies: jq

if ! command -v jq &>/dev/null; then
    echo "jq is not installed; please install it before running this script"
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

# Maximum log file size in bytes (10MB for logs)
max_size=10485760

echo "Monitoring Laravel logs in: '$log_file'"

# ANSI color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to format JSON with syntax highlighting
format_json_body() {
    local json_content="$1"
    local color="$2"

    # Check if pygmentize is available for syntax highlighting
    if command -v pygmentize &>/dev/null; then
        echo "$json_content" | pygmentize -l json -O style=monokai | while IFS= read -r line; do
            echo -e "  ${color}│${NC}   $line"
        done
    else
        # No syntax highlighting, just format with jq
        echo "$json_content" | while IFS= read -r line; do
            echo -e "  ${color}│${NC}   ${WHITE}$line${NC}"
        done
    fi
}

# Function to format SQL queries with syntax highlighting
format_sql_query() {
    local sql="$1"
    local color="$2"

    # Check if pg_format is available
    if command -v pg_format &>/dev/null; then
        # Use pg_format for proper SQL formatting, then remove statement number comments
        formatted_sql=$(echo "$sql" | pg_format -N - 2>/dev/null | grep -v '^[[:space:]]*-- Statement #' || echo "$sql")

        # Check if pygmentize is available for syntax highlighting
        if command -v pygmentize &>/dev/null; then
            echo "$formatted_sql" | pygmentize -l sql -O style=monokai | while IFS= read -r line; do
                echo -e "  ${color}│${NC}   $line"
            done
        else
            # Use pg_format but no syntax highlighting
            echo "$formatted_sql" | while IFS= read -r line; do
                echo -e "  ${color}│${NC}   ${WHITE}$line${NC}"
            done
        fi
    else
        # Fallback to basic formatting
        echo "$sql" | sed 's/^[[:space:]]*//' | while IFS= read -r line; do
            echo -e "  ${color}│${NC}   ${WHITE}$line${NC}"
        done
    fi
}

# Function to format log entries
format_log_entry() {
    local entry="$1"

    # Extract key information
    local level=$(echo "$entry" | jq -r '.level_name // "UNKNOWN"')
    local message=$(echo "$entry" | jq -r '.message // "No message"')
    local timestamp=$(echo "$entry" | jq -r '.datetime // ""')
    local channel=$(echo "$entry" | jq -r '.channel // ""')

    # Extract request context if available
    local request_id=$(echo "$entry" | jq -r '.context.context.request_id // empty')
    local method=$(echo "$entry" | jq -r '.context.context.method // empty')
    local path=$(echo "$entry" | jq -r '.context.context.path // empty')
    local status=$(echo "$entry" | jq -r '.context.context.status // empty')
    local duration=$(echo "$entry" | jq -r '.context.context.duration_ms // empty')

    # Color coding based on level
    case $level in
        "ERROR") color=$RED; symbol="❌" ;;
        "WARNING") color=$YELLOW; symbol="⚠️" ;;
        "INFO") color=$CYAN; symbol="ℹ️" ;;
        "DEBUG") color=$MAGENTA; symbol="🐛" ;;
        *) color=$BLUE; symbol="📝" ;;
    esac

    # Format timestamp (show time only)
    local time_only=""
    if [ -n "$timestamp" ]; then
        time_only=$(echo "$timestamp" | cut -d'T' -f2 | cut -d'.' -f1)
    fi

    # Main log line
    echo -e "${color}${symbol} [$level]${NC} ${time_only} ${channel:+($channel)} ${message}"

    # Special handling for User log entries
    if [ "$message" = "User" ]; then
        local user_id=$(echo "$entry" | jq -r '.context.id // empty')
        local user_name=$(echo "$entry" | jq -r '.context.name // empty')
        local user_email=$(echo "$entry" | jq -r '.context.email // empty')
        local is_guest=$(echo "$entry" | jq -r '.context.is_guest // false')
        local is_admin=$(echo "$entry" | jq -r '.context.is_admin // false')

        if [ -n "$user_id" ]; then
            echo -e "  ${CYAN}┌─ 👤 User Information${NC}"
            echo -e "  ${CYAN}│${NC}   ${GREEN}ID:${NC} $user_id"

            if [ -n "$user_name" ] && [ "$user_name" != "null" ]; then
                echo -e "  ${CYAN}│${NC}   ${GREEN}Name:${NC} $user_name"
            fi

            if [ -n "$user_email" ] && [ "$user_email" != "null" ]; then
                echo -e "  ${CYAN}│${NC}   ${GREEN}Email:${NC} $user_email"
            fi

            # Show flags with appropriate colors
            if [ "$is_guest" = "true" ] || [ "$is_guest" = "1" ]; then
                echo -e "  ${CYAN}│${NC}   ${YELLOW}Guest:${NC} Yes"
            fi

            if [ "$is_admin" = "true" ] || [ "$is_admin" = "1" ]; then
                echo -e "  ${CYAN}│${NC}   ${MAGENTA}Admin:${NC} Yes"
            fi

            echo -e "  ${CYAN}└─${NC}"
        fi
    fi

    # Request info if available
    if [ -n "$request_id" ]; then
        echo -e "  ${GREEN}Request:${NC} ${request_id:0:8} ${method} ${path} ${status:+→ $status} ${duration:+(${duration}ms)}"
    fi

    # Show events interleaved with SQL queries chronologically
    local events_count=$(echo "$entry" | jq '.context.events | length' 2>/dev/null || echo "0")
    if [ "$events_count" -gt 0 ]; then
        echo -e "  ${BLUE}Timeline:${NC}"

        # Initialize SQL query counter (using a temp file to persist across subshell)
        local sql_counter_file=$(mktemp)
        echo "0" > "$sql_counter_file"

        # Extract events as newline-separated JSON, sort by timestamp, then format
        echo "$entry" | jq -c '.context.events[]?' 2>/dev/null | \
        jq -s 'sort_by(.timestamp)' | \
        jq -c '.[]' | \
        while read -r event_json; do
            # Extract fields from the event JSON
            ts=$(echo "$event_json" | jq -r '.timestamp')
            level=$(echo "$event_json" | jq -r '.level')
            msg=$(echo "$event_json" | jq -r '.message')
            sql=$(echo "$event_json" | jq -r '.context.SQL // ""')

            # Format timestamp
            time_formatted=$(date -d "@$ts" +"%H:%M:%S" 2>/dev/null || echo "??:??:??")
            # Format full timestamp with milliseconds - extract milliseconds from the timestamp
            milliseconds=$(echo "$ts" | sed 's/.*\.//')
            timestamp_full=$(date -d "@${ts%.*}" +"%H:%M:%S.${milliseconds:0:3}" 2>/dev/null || echo "timestamp")

            # Color based on level
            case $level in
                "error") event_color=$RED; level_display="ERROR" ;;
                "warning") event_color=$YELLOW; level_display="WARN" ;;
                "info") event_color=$CYAN; level_display="INFO" ;;
                "debug") event_color=$MAGENTA; level_display="DEBUG" ;;
                *) event_color=$GRAY; level_display="${level^^}" ;;
            esac

            if [ "$msg" = "sql" ] && [ -n "$sql" ]; then
                # Increment SQL query counter (read, increment, write back)
                sql_query_num=$(cat "$sql_counter_file")
                sql_query_num=$((sql_query_num + 1))
                echo "$sql_query_num" > "$sql_counter_file"

                # Extract SQL metadata
                execution_time=$(echo "$event_json" | jq -r '.context.execution_time // ""')
                file_type=$(echo "$event_json" | jq -r '.context.file | type' 2>/dev/null || echo "string")
                
                # Format SQL query with syntax highlighting
                echo -e "  ${event_color}┌─ ${time_formatted} [${level_display}] SQL Query #${sql_query_num}${NC}"
                
                # Display metadata
                if [ -n "$execution_time" ] || [ "$file_type" != "null" ]; then
                    echo -e "  ${event_color}│${NC}"
                    if [ -n "$execution_time" ]; then
                        echo -e "  ${event_color}│${NC}   ${GREEN}Execution Time:${NC} ${execution_time}"
                    fi
                    if [ "$file_type" != "null" ]; then
                        if [ "$file_type" = "array" ]; then
                            # Handle array of trace lines
                            echo -e "  ${event_color}│${NC}   ${GREEN}File:${NC}"
                            echo "$event_json" | jq -r '.context.file[]?' 2>/dev/null | while IFS= read -r trace_line; do
                                if [ -n "$trace_line" ]; then
                                    echo -e "  ${event_color}│${NC}      ${GRAY}${trace_line}${NC}"
                                fi
                            done
                        else
                            # Handle string (backward compatibility)
                            file=$(echo "$event_json" | jq -r '.context.file // ""')
                            if [ -n "$file" ]; then
                                echo -e "  ${event_color}│${NC}   ${GREEN}File:${NC} ${file}"
                            fi
                        fi
                    fi
                fi
                echo -e "  ${event_color}│${NC}"

                # Format SQL with basic syntax highlighting
                format_sql_query "$sql" "$event_color"

                echo -e "  ${event_color}└─${NC} ${GRAY}($timestamp_full)${NC} ${sql:0:50}..."
            elif [ "$msg" = "Incoming Request" ]; then
                # Special handling for incoming requests
                method=$(echo "$event_json" | jq -r '.context.method // "GET"')
                url=$(echo "$event_json" | jq -r '.context.url // ""')
                query_params=$(echo "$event_json" | jq -r '.context.query_params // ""')
                body=$(echo "$event_json" | jq -r '.context.body // ""')

                echo -e "  ${event_color}┌─ ${time_formatted} [${level_display}] 📨 $msg${NC}"
                echo -e "  ${event_color}│${NC}   ${BOLD}$method${NC} $url"

                # Show query parameters if present
                if [ -n "$query_params" ] && [ "$query_params" != "{}" ] && [ "$query_params" != "null" ]; then
                    echo -e "  ${event_color}│${NC}   ${GREEN}Query:${NC} $(echo "$query_params" | jq -r 'to_entries | map("\(.key)=\(.value)") | join("&")' 2>/dev/null | head -c 100)"
                    if [ ${#query_params} -gt 100 ]; then
                        echo -e "  ${event_color}│${NC}   ${GRAY}... (truncated)${NC}"
                    fi
                fi

                # Show request body if present and not too large
                if [ -n "$body" ] && [ "$body" != "{}" ] && [ "$body" != "null" ] && [ "$body" != "[]" ]; then
                    # Try to pretty print JSON
                    formatted_body=$(echo "$body" | jq '.' 2>/dev/null | head -10)
                    if [ $? -eq 0 ] && [ -n "$formatted_body" ]; then
                        echo -e "  ${event_color}│${NC}   ${GREEN}Body:${NC}"
                        format_json_body "$formatted_body" "$event_color"
                        # Check if there are more lines
                        body_line_count=$(echo "$body" | jq '. | length' 2>/dev/null || echo "1")
                        if [ "$body_line_count" -gt 10 ] 2>/dev/null || [ $(echo "$body" | wc -l) -gt 10 ]; then
                            echo -e "  ${event_color}│${NC}     ${GRAY}... (truncated)${NC}"
                        fi
                    else
                        # Not valid JSON or too large, show truncated preview
                        body_preview=$(echo "$body" | head -c 200)
                        echo -e "  ${event_color}│${NC}   ${GREEN}Body:${NC} $body_preview"
                        if [ ${#body} -gt 200 ]; then
                            echo -e "  ${event_color}│${NC}   ${GRAY}... (truncated)${NC}"
                        fi
                    fi
                fi

                echo -e "  ${event_color}└─${NC} ${GRAY}($timestamp_full)${NC}"
            elif [ "$msg" = "Outgoing Response" ]; then
                # Special handling for outgoing responses
                status=$(echo "$event_json" | jq -r '.context.status_code // .context.status // 200')
                content_type=$(echo "$event_json" | jq -r '.context.content_type // ""')
                body=$(echo "$event_json" | jq -r '.context.body // ""')

                # Color status codes
                case $status in
                    2*) status_color=$GREEN ;;
                    3*) status_color=$YELLOW ;;
                    4*) status_color=$YELLOW ;;
                    5*) status_color=$RED ;;
                    *) status_color=$GRAY ;;
                esac

                echo -e "  ${event_color}┌─ ${time_formatted} [${level_display}] 📤 $msg${NC}"
                echo -e "  ${event_color}│${NC}   Status: ${status_color}$status${NC} ${content_type:+($content_type)}"

                # Show response body if present and not too large
                if [ -n "$body" ] && [ "$body" != "{}" ] && [ "$body" != "null" ] && [ "$body" != "[]" ]; then
                    # Try to pretty print JSON
                    formatted_body=$(echo "$body" | jq '.' 2>/dev/null | head -20)
                    if [ $? -eq 0 ] && [ -n "$formatted_body" ]; then
                        echo -e "  ${event_color}│${NC}   ${GREEN}Body:${NC}"
                        format_json_body "$formatted_body" "$event_color"
                        # Check if there are more lines
                        body_line_count=$(echo "$body" | jq '. | length' 2>/dev/null || echo "1")
                        if [ "$body_line_count" -gt 20 ] 2>/dev/null || [ $(echo "$body" | wc -l) -gt 20 ]; then
                            echo -e "  ${event_color}│${NC}     ${GRAY}... (truncated)${NC}"
                        fi
                    else
                        # Not valid JSON or too large, show truncated preview
                        body_preview=$(echo "$body" | head -c 200)
                        echo -e "  ${event_color}│${NC}   ${GREEN}Body:${NC} $body_preview"
                        if [ ${#body} -gt 200 ]; then
                            echo -e "  ${event_color}│${NC}   ${GRAY}... (truncated)${NC}"
                        fi
                    fi
                fi

                echo -e "  ${event_color}└─${NC} ${GRAY}($timestamp_full)${NC}"
            elif [ "$msg" = "Validation Failed" ] || [ "$msg" = "Validation exception caught" ]; then
                # Special handling for validation errors
                errors=$(echo "$event_json" | jq -r '.context.errors // .context.exception.errors // {}')
                method=$(echo "$event_json" | jq -r '.context.method // "UNKNOWN"')
                url=$(echo "$event_json" | jq -r '.context.url // ""')
                user_id=$(echo "$event_json" | jq -r '.context.user_id // "null"')

                # Check if this is a validation exception caught message
                if [ "$msg" = "Validation exception caught" ]; then
                    display_msg="🚫 Validation Exception Caught"
                else
                    display_msg="🚫 $msg"
                fi

                echo -e "  ${event_color}┌─ ${time_formatted} [${level_display}] $display_msg${NC}"
                echo -e "  ${event_color}│${NC}   ${BOLD}$method${NC} $url"

                # Show user ID if present
                if [ "$user_id" != "null" ]; then
                    echo -e "  ${event_color}│${NC}   ${GREEN}User ID:${NC} $user_id"
                fi

                # Show validation errors
                if [ -n "$errors" ] && [ "$errors" != "{}" ] && [ "$errors" != "null" ]; then
                    echo -e "  ${event_color}│${NC}   ${RED}Validation Errors:${NC}"
                    echo "$errors" | jq -r 'to_entries[] | "  \(.key): \(.value | join(", "))"' | while read -r error_line; do
                        echo -e "  ${event_color}│${NC}     ${RED}✗${NC} $error_line"
                    done
                else
                    # Try to extract errors from exception context for "Validation exception caught"
                    exception_errors=$(echo "$event_json" | jq -r '.context.exception.errors // empty' 2>/dev/null)
                    if [ -n "$exception_errors" ] && [ "$exception_errors" != "{}" ] && [ "$exception_errors" != "null" ]; then
                        echo -e "  ${event_color}│${NC}   ${RED}Validation Errors:${NC}"
                        echo "$exception_errors" | jq -r 'to_entries[] | "  \(.key): \(.value | join(", "))"' | while read -r error_line; do
                            echo -e "  ${event_color}│${NC}     ${RED}✗${NC} $error_line"
                        done
                    fi
                fi

                echo -e "  ${event_color}└─${NC} ${GRAY}($timestamp_full)${NC}"
            elif [ "$msg" = "User" ]; then
                # Special handling for User log entries
                local user_id=$(echo "$event_json" | jq -r '.context.id // empty')
                local user_name=$(echo "$event_json" | jq -r '.context.name // empty')
                local user_email=$(echo "$event_json" | jq -r '.context.email // empty')
                local is_guest=$(echo "$event_json" | jq -r '.context.is_guest // false')
                local is_admin=$(echo "$event_json" | jq -r '.context.is_admin // false')

                echo -e "  ${event_color}┌─ ${time_formatted} [${level_display}] 👤 $msg${NC}"

                if [ -n "$user_id" ] && [ "$user_id" != "null" ]; then
                    echo -e "  ${event_color}│${NC}   ${GREEN}ID:${NC} $user_id"

                    if [ -n "$user_name" ] && [ "$user_name" != "null" ]; then
                        echo -e "  ${event_color}│${NC}   ${GREEN}Name:${NC} $user_name"
                    fi

                    if [ -n "$user_email" ] && [ "$user_email" != "null" ]; then
                        echo -e "  ${event_color}│${NC}   ${GREEN}Email:${NC} $user_email"
                    fi

                    # Show flags with appropriate colors
                    if [ "$is_guest" = "true" ] || [ "$is_guest" = "1" ]; then
                        echo -e "  ${event_color}│${NC}   ${YELLOW}Guest:${NC} Yes"
                    fi

                    if [ "$is_admin" = "true" ] || [ "$is_admin" = "1" ]; then
                        echo -e "  ${event_color}│${NC}   ${MAGENTA}Admin:${NC} Yes"
                    fi
                fi

                echo -e "  ${event_color}└─${NC} ${GRAY}($timestamp_full)${NC}"
            else
                # Regular event
                echo -e "  ${event_color}┌─ ${time_formatted} [${level_display}]${NC} $msg"
                echo -e "  ${event_color}└─${NC} ${GRAY}($timestamp_full)${NC}"
            fi
        done
        
        # Clean up temp file
        [ -f "$sql_counter_file" ] && rm -f "$sql_counter_file"
    fi

    # Show exception details if present
    local exception=$(echo "$entry" | jq -r '.context.exception.message // empty' 2>/dev/null)
    if [ -n "$exception" ]; then
        echo -e "  ${RED}Exception:${NC} $exception"
        local file=$(echo "$entry" | jq -r '.context.exception.file // empty' 2>/dev/null)
        local line=$(echo "$entry" | jq -r '.context.exception.line // empty' 2>/dev/null)
        if [ -n "$file" ]; then
            echo -e "  ${RED}Location:${NC} $file:$line"
        fi
    fi

    echo "  ──────────────────────────────────────────────────────────────────────────────"
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
        # Extract new log entries and format them
        new_entries=$(tail -c +$((last_size + 1)) "$log_file" | jq -c '.' 2>/dev/null)

        # Process each JSON line
        echo "$new_entries" | while read -r line; do
            if [ -n "$line" ] && [ "$line" != "null" ]; then
                format_log_entry "$line"
            fi
        done

        last_size=$new_size
    fi

    # Wait for new lines to be added
    sleep 1
done
