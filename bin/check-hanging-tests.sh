#!/bin/bash

# Script to identify hanging or non-completing browser tests
# Usage: ./check-hanging-tests.sh
#
# Browser tests are independent (RefreshDatabase ensures isolation), so they can
# be run individually. Complex tests involving file uploads and JS interactions
# may take longer than simple tests, so the timeout is set accordingly.

set +e

# Configuration
TIMEOUT_SECONDS=60  # Timeout for individual browser tests (longer than Pest's 15s browser timeout)
RUN_INDIVIDUAL=true  # Set to true to run individual tests (tests should be independent with RefreshDatabase)
TEST_DIR="tests/Browser"
RESULTS_FILE="/tmp/test_results_$(date +%s).txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Checking for hanging browser tests..."
echo "Timeout set to ${TIMEOUT_SECONDS} seconds per test file"
echo "Results will be saved to: $RESULTS_FILE"
echo

# Check if timeout command is available
if ! command -v timeout &> /dev/null; then
    echo -e "${YELLOW}WARNING: 'timeout' command not found. Install it with: sudo apt-get install coreutils${NC}"
    echo -e "${YELLOW}Tests will run without timeout protection.${NC}"
    echo
fi

# Initialize results file
echo "Browser Test Hanging Check Results" > "$RESULTS_FILE"
echo "Run at: $(date)" >> "$RESULTS_FILE"
echo "Timeout: ${TIMEOUT_SECONDS} seconds" >> "$RESULTS_FILE"
echo "========================================" >> "$RESULTS_FILE"
echo >> "$RESULTS_FILE"

# Get list of browser test files
if [ ! -d "$TEST_DIR" ]; then
    echo -e "${RED}Error: $TEST_DIR directory not found${NC}"
    exit 1
fi

TEST_FILES=$(find "$TEST_DIR" -name "*.php" -type f | sort)

if [ -z "$TEST_FILES" ]; then
    echo -e "${RED}No test files found in $TEST_DIR${NC}"
    exit 1
fi

TOTAL_FILES=$(echo "$TEST_FILES" | wc -l)
echo "Found $TOTAL_FILES test files to check"

# Function to extract test names from a file
extract_test_names() {
    local file="$1"
    # Extract test function names (it() and test() functions)
    grep -E '^(it|test)\(' "$file" | sed 's/^\(it\|test\)(\s*['\''"]\([^'\''"]*\)['\''"]\s*,.*/\2/' | sed 's/^\(it\|test\)(\s*['\''"]\([^'\''"]*\)['\''"]\s*).*/\2/'
}

# Count total individual tests (only if running individually)
if [ "$RUN_INDIVIDUAL" = true ]; then
    TOTAL_TESTS=0
    for test_file in $TEST_FILES; do
        test_count=$(extract_test_names "$test_file" | wc -l)
        TOTAL_TESTS=$((TOTAL_TESTS + test_count))
    done
    echo "Found $TOTAL_TESTS individual tests to check"
else
    echo "Running entire test files (individual test count not available)"
    TOTAL_TESTS="N/A"
fi
echo

HANGING_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

# Function to run a single test with timeout
run_test_with_timeout() {
    local test_file="$1"
    local test_name="$2"
    local relative_path="${test_file#./}"

    echo -n "Testing $relative_path -> '$test_name'... "

    # Run the test with a simple timeout approach
    local start_time=$(date +%s)

    # Use timeout if available, otherwise run without
    if command -v timeout &> /dev/null; then
        timeout $TIMEOUT_SECONDS php artisan test --filter="$test_name" "$test_file" > /tmp/test_output_$$.log 2>&1
        local exit_code=$?
    else
        php artisan test --filter="$test_name" "$test_file" > /tmp/test_output_$$.log 2>&1
        local exit_code=$?
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $exit_code -eq 124 ] && command -v timeout &> /dev/null; then
        echo -e "${YELLOW}HANGING (timeout after ${TIMEOUT_SECONDS}s)${NC}"
        echo "HANGING: $relative_path -> '$test_name' (timeout after ${TIMEOUT_SECONDS}s)" >> "$RESULTS_FILE"
        ((HANGING_COUNT++))
    elif [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}PASSED (${duration}s)${NC}"
        echo "PASSED: $relative_path -> '$test_name' (${duration}s)" >> "$RESULTS_FILE"
        ((PASSED_COUNT++))
    else
        echo -e "${RED}FAILED (exit code: $exit_code, ${duration}s)${NC}"
        echo "FAILED: $relative_path -> '$test_name' (exit code: $exit_code, ${duration}s)" >> "$RESULTS_FILE"
        echo "----------------------------------------" >> "$RESULTS_FILE"
        cat /tmp/test_output_$$.log >> "$RESULTS_FILE"
        echo "----------------------------------------" >> "$RESULTS_FILE"
        echo >> "$RESULTS_FILE"
        ((FAILED_COUNT++))
    fi

    # Clean up temp file
    rm -f /tmp/test_output_$$.log
}

# Function to run tests for a file
run_file_tests() {
    local test_file="$1"
    local relative_path="${test_file#./}"

    echo "Running entire file: $relative_path..."

    # Run the entire test file with timeout
    local start_time=$(date +%s)

    if command -v timeout &> /dev/null; then
        timeout $TIMEOUT_SECONDS php artisan test "$test_file" > /tmp/test_output_$$.log 2>&1
        local exit_code=$?
    else
        php artisan test "$test_file" > /tmp/test_output_$$.log 2>&1
        local exit_code=$?
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $exit_code -eq 124 ] && command -v timeout &> /dev/null; then
        echo -e "${YELLOW}HANGING (timeout after ${TIMEOUT_SECONDS}s)${NC}"
        echo "HANGING: $relative_path (entire file, timeout after ${TIMEOUT_SECONDS}s)" >> "$RESULTS_FILE"
        ((HANGING_COUNT++))
    elif [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}PASSED (${duration}s)${NC}"
        echo "PASSED: $relative_path (entire file, ${duration}s)" >> "$RESULTS_FILE"
        ((PASSED_COUNT++))
    else
        echo -e "${RED}FAILED (exit code: $exit_code, ${duration}s)${NC}"
        echo "FAILED: $relative_path (entire file, exit code: $exit_code, ${duration}s)" >> "$RESULTS_FILE"
        echo "----------------------------------------" >> "$RESULTS_FILE"
        cat /tmp/test_output_$$.log >> "$RESULTS_FILE"
        echo "----------------------------------------" >> "$RESULTS_FILE"
        echo >> "$RESULTS_FILE"
        ((FAILED_COUNT++))
    fi

    # Clean up temp file
    rm -f /tmp/test_output_$$.log
}

# Run tests for each file
for test_file in $TEST_FILES; do
    if [ "$RUN_INDIVIDUAL" = true ]; then
        echo "Processing $test_file individually..."

        # Extract test names from this file
        test_names=$(extract_test_names "$test_file")

        if [ -z "$test_names" ]; then
            echo -e "${YELLOW}No tests found in $test_file${NC}"
            continue
        fi

        # Run each test individually
        while IFS= read -r test_name; do
            if [ -n "$test_name" ]; then
                run_test_with_timeout "$test_file" "$test_name"
            fi
        done <<< "$test_names"
    else
        # Run entire file
        run_file_tests "$test_file"
    fi
done

# Summary
echo
echo "========================================" >> "$RESULTS_FILE"
echo "SUMMARY:" >> "$RESULTS_FILE"
echo "Total files processed: $TOTAL_FILES" >> "$RESULTS_FILE"
if [ "$RUN_INDIVIDUAL" = true ]; then
    echo "Total tests checked: $TOTAL_TESTS" >> "$RESULTS_FILE"
fi
echo "Passed: $PASSED_COUNT" >> "$RESULTS_FILE"
echo "Failed: $FAILED_COUNT" >> "$RESULTS_FILE"
echo "Hanging: $HANGING_COUNT" >> "$RESULTS_FILE"
echo >> "$RESULTS_FILE"

echo "========================================"
echo "SUMMARY:"
echo "Total files processed: $TOTAL_FILES"
if [ "$RUN_INDIVIDUAL" = true ]; then
    echo "Total tests checked: $TOTAL_TESTS"
fi
echo "Passed: $PASSED_COUNT"
echo "Failed: $FAILED_COUNT"
echo "Hanging: $HANGING_COUNT"
echo
echo "Detailed results saved to: $RESULTS_FILE"
echo
echo "To view detailed results:"
echo "cat $RESULTS_FILE"
echo
echo "To run only hanging tests manually (with longer timeout):"
if [ $HANGING_COUNT -gt 0 ]; then
    if [ "$RUN_INDIVIDUAL" = true ]; then
        echo "grep 'HANGING:' $RESULTS_FILE | cut -d' ' -f2- | while read -r line; do"
        echo "  test_file=\$(echo \"\$line\" | cut -d' ' -f1)"
        echo "  test_name=\$(echo \"\$line\" | sed 's/.*-> //' | tr -d \"'\")"
        echo "  echo \"Running \$test_file -> \$test_name with 300s timeout...\""
        echo "  timeout 300 php artisan test --filter=\"\$test_name\" \"\$test_file\" || echo \"Still hanging or failed\""
        echo "done"
    else
        echo "grep 'HANGING:' $RESULTS_FILE | cut -d' ' -f2 | while read -r test_file; do"
        echo "  echo \"Running $test_file with 300s timeout...\""
        echo "  timeout 300 php artisan test \"$test_file\" || echo \"Still hanging or failed\""
        echo "done"
    fi
fi