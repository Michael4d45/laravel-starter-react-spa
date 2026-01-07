#!/bin/bash
# Kitchen Assistant Development TMUX Setup
# Creates 3-panel development environment

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_NAME="kitchen-dev"

# Check for flags
ATTACH=true
DOCKER=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-attach)
            ATTACH=false
            shift
            ;;
        --docker)
            DOCKER=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Session '$SESSION_NAME' already exists."
    if [ "$ATTACH" = true ]; then
        tmux attach-session -t "$SESSION_NAME"
    fi
    exit 0
fi

# Create new session with single window containing 3-pane layout
tmux new-session -d -s "$SESSION_NAME" -n "dev" -c "$PROJECT_DIR"

# Wait a moment for session to be ready
sleep 0.3

# Helper function to get the active pane ID
get_active_pane() {
    tmux list-panes -t "$SESSION_NAME:dev" -F '#{pane_id} #{?pane_active,1,0}' | grep ' 1$' | cut -d' ' -f1
}

# Get the initial pane ID (will become the log pane on the left)
LOG_PANE=$(get_active_pane)

# Setup left pane: Log Formatter (full height)
tmux send-keys -t "$LOG_PANE" "while true; do ./bin/format-logs.sh || (echo 'Log formatter died, retrying in 10 seconds...' && sleep 10); done" C-m

# Split vertically from left to create right side
tmux select-pane -t "$LOG_PANE"
tmux split-window -h -c "$PROJECT_DIR"
sleep 0.3
RIGHT_TOP_PANE=$(get_active_pane)

# Setup right top pane: Backend Server
tmux send-keys -t "$RIGHT_TOP_PANE" "while true; do php artisan serve || (echo 'Server died, retrying in 10 seconds...' && sleep 10); done" C-m

# Split horizontally from right top to create right bottom pane: Frontend Dev Server
tmux select-pane -t "$RIGHT_TOP_PANE"
tmux split-window -v -c "$PROJECT_DIR" -t "$RIGHT_TOP_PANE"
sleep 0.3
NPM_PANE=$(get_active_pane)
tmux send-keys -t "$NPM_PANE" "while true; do npm run dev || (echo 'Dev server died, retrying in 10 seconds...' && sleep 10); done" C-m

# If --docker flag is set, add docker panel below npm dev
if [ "$DOCKER" = true ]; then
    tmux select-pane -t "$NPM_PANE"
    tmux split-window -v -c "$PROJECT_DIR"
    sleep 0.3
    DOCKER_PANE=$(get_active_pane)
    tmux send-keys -t "$DOCKER_PANE" "while true; do if ! docker compose ps 2>/dev/null | grep -q 'Up'; then docker compose up || (echo 'Docker compose failed, retrying in 10 seconds...' && sleep 10); else sleep 5; fi; done" C-m
fi

# Select the backend pane (top-right) as active
tmux select-pane -t "$RIGHT_TOP_PANE"

# Attach to the session if requested
if [ "$ATTACH" = true ]; then
    tmux attach-session -t "$SESSION_NAME"
else
    echo "Session '$SESSION_NAME' created successfully. Use 'tmux attach -t $SESSION_NAME' to connect."
fi
