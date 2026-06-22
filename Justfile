set shell := ["bash", "-euo", "pipefail", "-c"]

default:
	@just --list

# Install dependencies if node_modules is missing.
install:
	test -d node_modules || npm install

# Run the local Vite dev server.
dev: (install)
	npm run dev

# Backward-compatible alias from the parent repository.
viz-dev: dev

# Build the static app.
build: (install)
	npm run build

# Backward-compatible alias from the parent repository.
viz-build: build

# Preview the production build.
preview: (install)
	npm run preview
