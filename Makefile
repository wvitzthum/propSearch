.PHONY: install start start-tmux build lint clean agent agent-po agent-analyst agent-data agent-fe agent-qa agent-de tasks help guard-install agent-windows agent-tmux-all agent-po-tmux agent-analyst-tmux agent-de-tmux agent-fe-tmux agent-qa-tmux sync price-monitor enrich

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

# Start propSearch in a persistent tmux session (reattach with: tmux attach -t propsearch-dev)
# If the session already exists and the server is running, skips start and attaches directly.
start-tmux:
	@SESSION=propsearch-dev; \
	if tmux has-session -t "$$SESSION" 2>/dev/null; then \
		echo "Session '$$SESSION' already exists — attaching."; \
	else \
		echo "Creating new tmux session '$$SESSION'..."; \
		tmux new-session -d -s "$$SESSION"; \
		tmux send-keys -t "$$SESSION" "echo '=== propSearch Dev Session ===' && echo 'Starting server + frontend...'" Enter; \
		tmux send-keys -t "$$SESSION" "node server/index.js &" Enter; \
		tmux send-keys -t "$$SESSION" "cd frontend && npm run dev" Enter; \
		sleep 2; \
	fi; \
	tmux attach -t "$$SESSION"

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

# Run weekly price monitor — detects price reductions, records snapshots
price-monitor:
	@echo "Running Weekly Price Monitor..."
	@node scripts/price_monitor.js

# Run enrichment pipeline on inbox leads
enrich:
	@echo "Running Enrichment Pipeline..."
	@node agents/data_analyst/enrich_leads.js

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
# If the session already exists, just attaches — does NOT restart agents.
agent-tmux-grid:
	@SESSION=propSearch; \
	if tmux has-session -t "$$SESSION" 2>/dev/null; then \
		echo "Session '$$SESSION' already exists — attaching."; \
		tmux attach-session -t "$$SESSION"; \
	else \
		echo "Creating new tmux session '$$SESSION' with 5 agent panes..."; \
		tmux new-session -d -s "$$SESSION" -n "Agents"; \
		\
		tmux set-window-option -t "$$SESSION:Agents" automatic-rename off; \
		tmux set-window-option -t "$$SESSION:Agents" allow-rename off; \
		tmux set-option -t "$$SESSION:Agents" pane-border-status top; \
		tmux set-option -t "$$SESSION:Agents" pane-border-format "── #P: #[fg=cyan,bold]#{@agent}#[default] ──"; \
		\
		tmux set-option -p -t "$$SESSION:Agents.0" @agent "PRODUCT OWNER"; \
		tmux send-keys -t "$$SESSION:Agents.0" "./agents/run.sh po" Enter; \
		\
		tmux split-window -h -t "$$SESSION:Agents"; \
		tmux set-option -p -t "$$SESSION:Agents.1" @agent "DATA ANALYST"; \
		tmux send-keys -t "$$SESSION:Agents.1" "./agents/run.sh analyst" Enter; \
		\
		tmux select-pane -t "$$SESSION:0"; \
		tmux split-window -v -t "$$SESSION:Agents"; \
		tmux set-option -p -t "$$SESSION:Agents.1" @agent "DATA ENGINEER"; \
		tmux send-keys -t "$$SESSION:Agents.1" "./agents/run.sh de" Enter; \
		\
		tmux select-pane -t "$$SESSION:2"; \
		tmux split-window -v -t "$$SESSION:Agents"; \
		tmux set-option -p -t "$$SESSION:Agents.3" @agent "FRONTEND ENGINEER"; \
		tmux send-keys -t "$$SESSION:Agents.3" "./agents/run.sh fe" Enter; \
		\
		tmux split-window -v -t "$$SESSION:Agents"; \
		tmux set-option -p -t "$$SESSION:Agents.4" @agent "UI/UX QA"; \
		tmux send-keys -t "$$SESSION:Agents.4" "./agents/run.sh qa" Enter; \
		\
		tmux select-layout -t "$$SESSION:Agents" tiled; \
		tmux attach-session -t "$$SESSION"; \
	fi

# Open all agents in separate tmux windows (parallel)
# If the session already exists, just attaches — does NOT restart agents.
agent-tmux-all:
	@SESSION=propSearch; \
	if tmux has-session -t "$$SESSION" 2>/dev/null; then \
		echo "Session '$$SESSION' already exists — attaching."; \
		tmux attach-session -t "$$SESSION"; \
	else \
		echo "Creating new tmux session '$$SESSION' with agent windows..."; \
		tmux new-session -d -s "$$SESSION" -n "PO" "./agents/run.sh po"; \
		tmux new-window -t "$$SESSION" -n "ANALYST" "./agents/run.sh analyst"; \
		tmux new-window -t "$$SESSION" -n "DE" "./agents/run.sh de"; \
		tmux new-window -t "$$SESSION" -n "FE" "./agents/run.sh fe"; \
		tmux new-window -t "$$SESSION" -n "QA" "./agents/run.sh qa"; \
		tmux select-window -t "$$SESSION:PO"; \
		tmux attach-session -t "$$SESSION"; \
	fi

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
	@echo "  make start      - Start API server + frontend dev (background)"
	@echo "  make start-tmux - Start in persistent tmux session (reattach: tmux attach -t propsearch-dev)"
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
	@echo "  make agent-tmux-grid       - Open all 5 agents in 1 window (grid layout; reuses session)"
	@echo "  make agent-tmux-all        - Open all 5 agents in separate windows (tabs; reuses session)"
	@echo ""
	@echo "New Windows (VSCode - type commands manually):"
	@echo "  make agent-windows         - Open 5 VSCode windows"
	@echo ""
	@echo "Also available:"
	@echo "  source agents/aliases.sh  - Shell aliases (po, analyst, de, fe, qa)"
