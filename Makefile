.PHONY: install start build lint clean agent-po agent-data agent-frontend agent-qa tasks

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

# Start the immoSearch Full Stack (API + Dashboard)
start:
	@echo "Starting immoSearch Full Stack..."
	node server/index.js & cd frontend && npm run dev

# Start the Data API server
api:
	@echo "Starting immoSearch Data API..."
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
	@gemini -i "You are the Product Owner & Strategic Lead. Please load and follow the instructions in agents/product_owner/README.md and REQUIREMENTS.md to guide the project's vision and backlog."

# Invoke the Data Gatherer agent
agent-data:
	@gemini -i "You are the Senior Real Estate Data Engineer. Please load and follow the instructions in agents/data_gatherer/README.md to maintain the property datasets. Remember the Data Authenticity mandate."

# Invoke the Frontend Engineer agent
agent-fe:
	@gemini -i "You are the Lead Frontend Engineer & UX Architect. Please load and follow the instructions in agents/frontend_engineer/README.md to develop the 'Bloomberg meets Linear' dashboard. Follow the Gemini CLI execution guidelines for background processes."

# Invoke the UI/UX QA agent
agent-qa:
	@gemini -i "You are the UI/UX Quality Assurance Engineer. Please load and follow the instructions in agents/ui_ux_qa/README.md to audit the dashboard against REQUIREMENTS.md and the 'Linear' design standard."

# --- Project Management ---

# Display the active backlog from Tasks.md
tasks:
	@echo "--- Active Backlog ---"
	@grep -v "Done" Tasks.md | grep -E "^\| [A-Z]+-[0-9]+" || echo "No active tasks found."
