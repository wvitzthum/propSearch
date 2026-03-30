Y.PHONY: install start build lint clean agent-po agent-analyst agent-data agent-fe agent-qa tasks

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

# --- Agent Aliases ---

# Invoke the Product Owner agent
agent-po:
	@claude -p "You are the Product Owner & Strategic Lead. Please load and follow the instructions in agents/product_owner/README.md and REQUIREMENTS.md to guide the project's vision and backlog."

# Invoke the Data Analyst agent
agent-analyst:
	@claude -p "You are the Senior Real Estate Data Analyst. Please load and follow the instructions in agents/data_analyst/README.md and REQUIREMENTS.md to perform property research and calculate Alpha signals. Enrich all assets using live internet data per Requirement 1, 11, and 12, following the schema in data/import/PROMPT_GUIDE.md. Remember the Data Authenticity mandate."

# Invoke the Data Engineer agent
agent-data:
	@claude -p "You are the Senior Real Estate Data Engineer. Please load and follow the instructions in agents/data_engineer/README.md and REQUIREMENTS.md to manage the SQLite architecture and ingestion pipeline."

# Invoke the Frontend Engineer agent
agent-fe:
	@claude -p "You are the Lead Frontend Engineer & UX Architect. Please load and follow the instructions in agents/frontend_engineer/README.md to develop the 'Bloomberg meets Linear' dashboard."

# Invoke the UI/UX QA agent
agent-qa:
	@claude -p "You are the UI/UX Quality Assurance Engineer. Please load and follow the instructions in agents/ui_ux_qa/README.md to audit the dashboard against REQUIREMENTS.md and the 'Linear' design standard."

# --- Project Management ---

# Spawn all agent terminals (Requires VS Code 'code' CLI or Task Runner)
spawn-agents:
	@./scripts/spawn_agents.sh

# Display the active backlog from Tasks.md
tasks:
	@echo "--- Active Backlog ---"
	@grep -v "Done" Tasks.md | grep -E "^\| [A-Z]+-[0-9]+" || echo "No active tasks found."
