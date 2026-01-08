#!/bin/bash
# Laravel React SPA Development TMUX Setup
# Creates 5-panel development environment (logs, backend, frontend, queue, reverb)

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_NAME="react-spa-dev"

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

# Create new session with single window containing 5-pane layout
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
# We'll use -p 66 to give the right side more room initially, 
# then let select-layout equalize them.
tmux split-window -h -c "$PROJECT_DIR" -p 60
sleep 0.3
RIGHT_TOP_PANE=$(get_active_pane)

# Setup right top pane: Backend Server
tmux send-keys -t "$RIGHT_TOP_PANE" "while true; do php artisan serve || (echo 'Server died, retrying in 10 seconds...' && sleep 10); done" C-m

# Create the other panes on the right first
# Frontend Dev Server
tmux split-window -v -c "$PROJECT_DIR" -t "$RIGHT_TOP_PANE"
NPM_PANE=$(get_active_pane)
tmux send-keys -t "$NPM_PANE" "while true; do npm run dev || (echo 'Dev server died, retrying in 10 seconds...' && sleep 10); done" C-m

# Queue Worker
tmux split-window -v -c "$PROJECT_DIR" -t "$NPM_PANE"
QUEUE_PANE=$(get_active_pane)
tmux send-keys -t "$QUEUE_PANE" "while true; do php artisan queue:work --tries=3 || (echo 'Queue worker died, retrying in 10 seconds...' && sleep 10); done" C-m

# Reverb Server
tmux split-window -v -c "$PROJECT_DIR" -t "$QUEUE_PANE"
REVERB_PANE=$(get_active_pane)
tmux send-keys -t "$REVERB_PANE" "while true; do php artisan reverb:start || (echo 'Reverb died, retrying in 10 seconds...' && sleep 10); done" C-m

# If --docker flag is set, add docker panel
if [ "$DOCKER" = true ]; then
    tmux split-window -v -c "$PROJECT_DIR" -t "$REVERB_PANE"
    DOCKER_PANE=$(get_active_pane)
    tmux send-keys -t "$DOCKER_PANE" "while true; do if ! docker compose ps 2>/dev/null | grep -q 'Up'; then docker compose up || (echo 'Docker compose failed, retrying in 10 seconds...' && sleep 10); else sleep 5; fi; done" C-m
fi

# NOW EQUALIZE: This is the magic part.
# main-vertical makes the first pane (Logs) take up 'main-pane-width' 
# and all other panes split the right side equally.
tmux set-window-option -t "$SESSION_NAME:dev" main-pane-width 80
tmux select-layout -t "$SESSION_NAME:dev" main-vertical

# Select the backend pane (top-right) as active
tmux select-pane -t "$RIGHT_TOP_PANE"

# Attach to the session if requested
if [ "$ATTACH" = true ]; then
    tmux attach-session -t "$SESSION_NAME"
else
    echo "Session '$SESSION_NAME' created successfully. Use 'tmux attach -t $SESSION_NAME' to connect."
fi
