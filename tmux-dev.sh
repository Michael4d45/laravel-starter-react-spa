#!/bin/bash
# Laravel React SPA Development TMUX Setup
# Creates 5-panel development environment (logs, backend, frontend, queue, reverb)

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_NAME="react-spa-dev"
SESSION_WIDTH="${COLUMNS:-160}"
SESSION_HEIGHT="${LINES:-48}"
RIGHT_PANE_WIDTH=$((SESSION_WIDTH * 60 / 100))

# Check for flags
ATTACH=true
DOCKER=false
RESET=false
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
        --reset)
            RESET=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    if [ "$RESET" = true ]; then
        echo "Resetting existing session '$SESSION_NAME'..."
        tmux kill-session -t "$SESSION_NAME"
    else
    echo "Session '$SESSION_NAME' already exists."
    if [ "$ATTACH" = true ]; then
        tmux attach-session -t "$SESSION_NAME"
    fi
    exit 0
    fi
fi

# Create new session with single window containing 5-pane layout
LOG_PANE=$(tmux new-session -d -P -F '#{pane_id}' -x "$SESSION_WIDTH" -y "$SESSION_HEIGHT" -s "$SESSION_NAME" -n "dev" -c "$PROJECT_DIR")

# Wait a moment for session to be ready
sleep 0.3

# Setup left pane: Log Formatter (full height)
tmux send-keys -t "$LOG_PANE" "while true; do php artisan log:monitor --auto-truncate=10MB || (echo 'Log formatter died, retrying in 10 seconds...' && sleep 10); done" C-m

# Split vertically from left to create right side
# Use a fixed pane width here because percentage-based splits can fail in detached sessions.
RIGHT_TOP_PANE=$(tmux split-window -h -P -F '#{pane_id}' -c "$PROJECT_DIR" -l "$RIGHT_PANE_WIDTH" -t "$LOG_PANE")
sleep 0.3

if [ -z "$RIGHT_TOP_PANE" ]; then
    echo "Failed to create backend pane. Check tmux version and terminal size."
    exit 1
fi

# Setup right top pane: Backend Server
tmux send-keys -t "$RIGHT_TOP_PANE" "while true; do php artisan serve || (echo 'Server died, retrying in 10 seconds...' && sleep 10); done" C-m

# Create the other panes on the right first
# Frontend Dev Server
NPM_PANE=$(tmux split-window -v -P -F '#{pane_id}' -c "$PROJECT_DIR" -t "$RIGHT_TOP_PANE")
tmux send-keys -t "$NPM_PANE" "while true; do npm run dev || (echo 'Dev server died, retrying in 10 seconds...' && sleep 10); done" C-m

# Queue Worker
QUEUE_PANE=$(tmux split-window -v -P -F '#{pane_id}' -c "$PROJECT_DIR" -t "$NPM_PANE")
tmux send-keys -t "$QUEUE_PANE" "while true; do php artisan queue:work --tries=3 || (echo 'Queue worker died, retrying in 10 seconds...' && sleep 10); done" C-m

# Reverb Server
REVERB_PANE=$(tmux split-window -v -P -F '#{pane_id}' -c "$PROJECT_DIR" -t "$QUEUE_PANE")
tmux send-keys -t "$REVERB_PANE" "while true; do php artisan reverb:start || (echo 'Reverb died, retrying in 10 seconds...' && sleep 10); done" C-m

# If --docker flag is set, add docker panel
if [ "$DOCKER" = true ]; then
    DOCKER_PANE=$(tmux split-window -v -P -F '#{pane_id}' -c "$PROJECT_DIR" -t "$REVERB_PANE")
    tmux send-keys -t "$DOCKER_PANE" "while true; do if ! docker compose ps 2>/dev/null | grep -q 'Up'; then docker compose up || (echo 'Docker compose failed, retrying in 10 seconds...' && sleep 10); else sleep 5; fi; done" C-m
fi

# NOW EQUALIZE: This is the magic part.
# main-vertical makes the first pane (Logs) take up 'main-pane-width' 
# and all other panes split the right side equally.
tmux set-window-option -t "$SESSION_NAME:dev" main-pane-width 100
tmux select-layout -t "$SESSION_NAME:dev" main-vertical

# Select the backend pane (top-right) as active
tmux select-pane -t "$RIGHT_TOP_PANE"

# Attach to the session if requested
if [ "$ATTACH" = true ]; then
    tmux attach-session -t "$SESSION_NAME"
else
    echo "Session '$SESSION_NAME' created successfully. Use 'tmux attach -t $SESSION_NAME' to connect."
fi
