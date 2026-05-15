.PHONY: dev build install format format-check lint clean

# Run backend and frontend concurrently
dev:
	@trap 'kill 0' SIGINT; \
	(cd backend && uv run fastapi dev src/main.py) & \
	(cd frontend && npm run dev) & \
	wait

install:
	cd backend && uv sync
	cd frontend && npm install

build:
	cd frontend && npm run build

format:
	cd backend && uv run black src/
	cd frontend && npm run format

format-check:
	cd backend && uv run black --check src/
	cd frontend && npm run format:check

lint:
	cd backend && uv run black --check src/
	cd frontend && npm run format:check

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	rm -rf frontend/dist frontend/node_modules/.vite

.DEFAULT_GOAL := dev
