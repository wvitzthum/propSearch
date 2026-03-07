.PHONY: install start build lint clean

# Default target
all: install start

# Install all dependencies
install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Start the frontend development server
start:
	@echo "Starting immoSearch Dashboard..."
	cd frontend && npm run dev

# Build the frontend for production
build:
	@echo "Building frontend for production..."
	cd frontend && npm run build

# Run linting
lint:
	@echo "Running linter..."
	cd frontend && npm run lint

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite
