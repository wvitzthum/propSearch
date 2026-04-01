.PHONY: install start build lint clean agent agent-po agent-analyst agent-data agent-fe agent-qa agent-de tasks help guard-install agent-windows agent-tmux-all agent-po-tmux agent-analyst-tmux agent-de-tmux agent-fe-tmux agent-qa-tmux

# Default target
all: install start

# --- Standard Build & Development ---
# [AGENT OPTIMIZATION]: All high-volume commands (npm, tsc, lint, sync) are
# optimized via 'rtk' (Rust Token Killer) to reduce token noise by 60-90%.
# If a cryptic error occurs, agents should use 'rtk --raw <command>' to
# view the unedited terminal output.

# Install all dependencies
install:
	@echo "Installing frontend dependencies..."
	@rtk cd frontend && npm install

# Start the propSearch Full Stack (API + Dashboard)
start:
	@echo "Starting propSearch Full Stack..."
	node server/index.js & cd frontend && npm run dev

# Start the Data API server
api:
	@echo "Starting propSearch Data API..."
	node server/index.js

# Alias for start
dev: start

# Run data sync pipeline
sync:
	@echo "Running Data Sync Cycle..."
	@rtk node scripts/sync_data.js

# Build the frontend for production
build:
	@echo "Building frontend for production..."
	@rtk cd frontend && npm run build

# Run linting
lint:
	@echo "Running linter..."
	@rtk cd frontend && npm run lint

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite

# --- Agent Orchestrator ---
# Usage: make agent agent=po
#        make agent agent=analyst task=DE-140
#        make agent agent=fe "refactor PropertyTable"
agent:
	@./agents/run.sh $(agent) $(task) "$(context)"

# --- Individual Agent Aliases ---
# These use the orchestrator which loads AGENTS.md + agent README automatically

# Invoke the Product Owner agent
agent-po:
	@./agents/run.sh po

# ====================
# OPTION 2: tmux (Recommended for Agents)
# ====================

# Open all agents in a single window with 5 panes (grid view)
agent-tmux-grid:
	@tmux kill-session -t propSearch 2>/dev/null || true
	@tmux new-session -d -s propSearch -n "Agents"
	
	# Use a custom variable (@agent) so applications can't overwrite it
	@tmux set-window-option -t propSearch:Agents automatic-rename off
	@tmux set-window-option -t propSearch:Agents allow-rename off
	@tmux set-option -t propSearch:Agents pane-border-status top
	@tmux set-option -t propSearch:Agents pane-border-format "── #P: #[fg=cyan,bold]#{@agent}#[default] ──"
	
	# Pane 0: PO
	@tmux set-option -p -t propSearch:Agents.0 @agent "PRODUCT OWNER"
	@tmux send-keys -t propSearch:Agents.0 "./agents/run.sh po" Enter
	
	# Pane 1: Analyst (Split H from 0)
	@tmux split-window -h -t propSearch:Agents
	@tmux set-option -p -t propSearch:Agents.1 @agent "DATA ANALYST"
	@tmux send-keys -t propSearch:Agents.1 "./agents/run.sh analyst" Enter
	
	@tmux select-pane -t 0
	@tmux split-window -v -t propSearch:Agents
	@tmux set-option -p -t propSearch:Agents.1 @agent "DATA ENGINEER"
	@tmux send-keys -t propSearch:Agents.1 "./agents/run.sh de" Enter
	
	@tmux select-pane -t 2
	@tmux split-window -v -t propSearch:Agents
	@tmux set-option -p -t propSearch:Agents.3 @agent "FRONTEND ENGINEER"
	@tmux send-keys -t propSearch:Agents.3 "./agents/run.sh fe" Enter
	
	@tmux split-window -v -t propSearch:Agents
	@tmux set-option -p -t propSearch:Agents.4 @agent "UI/UX QA"
	@tmux send-keys -t propSearch:Agents.4 "./agents/run.sh qa" Enter
	
	@tmux select-layout -t propSearch:Agents tiled
	@tmux attach-session -t propSearch

# Open all agents in separate tmux windows (parallel)
agent-tmux-all:
	@tmux kill-session -t propSearch 2>/dev/null || true
	@tmux new-session -d -s propSearch -n "PO" "./agents/run.sh po"
	@tmux new-window -t propSearch -n "ANALYST" "./agents/run.sh analyst"
	@tmux new-window -t propSearch -n "DE" "./agents/run.sh de"
	@tmux new-window -t propSearch -n "FE" "./agents/run.sh fe"
	@tmux new-window -t propSearch -n "QA" "./agents/run.sh qa"
	@tmux select-window -t propSearch:PO
	@tmux attach-session -t propSearch

# ====================
# OPTION 3: VSCode windows only (run commands manually)
# ====================
agent-windows:
	@code --new-window . & \
	 code --new-window . & \
	 code --new-window . & \
	 code --new-window . & \
	 code --new-window . &
	@echo "Opened 5 VSCode windows. Run in each: ./agents/run.sh <po|analyst|de|fe|qa>"

# Invoke the Data Analyst agent
agent-analyst:
	@./agents/run.sh analyst

# Invoke the Data Engineer agent
agent-de:
	@./agents/run.sh de

# Alias for backward compatibility
agent-data: agent-de

# Invoke the Frontend Engineer agent
agent-fe:
	@./agents/run.sh fe

# Invoke the UI/UX QA agent
agent-qa:
	@./agents/run.sh qa

# --- Project Management ---

# Install the pre-commit data guard hook (blocks accidental data commits)
guard-install:
	@echo "Installing pre-commit data guard hook..."
	@cp scripts/pre-commit-data-guard.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
	@echo "✓ Data guard hook installed. All commits will be validated."

# --- Task Management ---
# [AGENT OPTIMIZATION]: Task queries use tasks/tasks.json (JSON source of truth).
# RTK-optimised jq queries (replace grep + range reads):
#   jq '.tasks[] | select(.id=="DAT-155")'              tasks/tasks.json
#   jq '.tasks[] | select(.status=="Todo")'             tasks/tasks.json
#   jq '.tasks[] | select(.section=="data_research")'   tasks/tasks.json
#   jq '.tasks[] | select(.responsible=="Data Analyst")' tasks/tasks.json
# To mark a task Done: edit tasks/tasks.json directly (object-level write, no column risk).
# To regenerate Tasks.md: make tasks-regen

# Display the active backlog (human-readable, from generated Tasks.md)
tasks:
	@echo "--- Active Backlog ---"
	@grep -E "^\| [A-Z]+-[0-9]+" Tasks.md | grep -vE "^\| ID \|" || echo "No active tasks found."

# Regenerate Tasks.md from tasks/tasks.json (run after any task status change)
tasks-regen:
	@python3 tasks/scripts/generate_tasks_markdown.py --write
	@echo "✓ Tasks.md regenerated from tasks/tasks.json"

# Display available make targets
help:
	@echo "propSearch Makefile"
	@echo ""
	@echo "Development:"
	@echo "  make install    - Install frontend dependencies"
	@echo "  make start      - Start API server + frontend dev"
	@echo "  make api        - Start API server only"
	@echo "  make sync       - Run data sync pipeline"
	@echo "  make build      - Build frontend for production"
	@echo "  make lint       - Run linter"
	@echo "  make clean      - Clean build artifacts"
	@echo ""
	@echo "Agents (via orchestrator):"
	@echo "  make agent-po      - Product Owner"
	@echo "  make agent-analyst - Data Analyst"
	@echo "  make agent-de      - Data Engineer"
	@echo "  make agent-fe      - Frontend Engineer"
	@echo "  make agent-qa      - UI/UX QA"
	@echo ""
	@echo "  make agent agent=po                    - Generic agent invocation"
	@echo "  make agent agent=analyst task=DE-140   - With task context"
	@echo "  make agent agent=fe \"custom context\"   - With extra context"
	@echo ""
	@echo "New Windows (tmux - recommended):"
	@echo "  make agent-tmux-grid       - Open all 5 agents in 1 window (grid layout)"
	@echo "  make agent-tmux-all        - Open all 5 agents in separate windows (tabs)"
	@echo ""
	@echo "New Windows (VSCode - type commands manually):"
	@echo "  make agent-windows         - Open 5 VSCode windows"
	@echo ""
	@echo "Also available:"
	@echo "  source agents/aliases.sh  - Shell aliases (po, analyst, de, fe, qa)"
