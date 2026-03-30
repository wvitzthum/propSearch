.PHONY: install start build lint clean agent agent-po agent-analyst agent-data agent-fe agent-qa agent-de tasks help

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

# Display the active backlog from Tasks.md
tasks:
	@echo "--- Active Backlog ---"
	@grep -v "Done" Tasks.md | grep -E "^\| [A-Z]+-[0-9]+" || echo "No active tasks found."

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
	@echo "Also available:"
	@echo "  source agents/aliases.sh  - Shell aliases (po, analyst, de, fe, qa)"
