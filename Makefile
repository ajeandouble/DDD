.PHONY: dev dev-backend dev-frontend build install \
        format format-check lint clean

# ── combined ──────────────────────────────────────────────────────────────────
dev:
	@set -e; \
	trap 'kill 0; exit 0' INT TERM EXIT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

# ── backend ───────────────────────────────────────────────────────────────────
dev-backend:
	cd backend && uv run fastapi dev src/main.py

install-backend:
	cd backend && uv sync

format-backend:
	cd backend && uv run black src/

format-check-backend:
	cd backend && uv run black --check src/

# ── frontend ──────────────────────────────────────────────────────────────────
dev-frontend:
	cd frontend && npm run dev

install-frontend:
	cd frontend && npm install

build:
	cd frontend && npm run build

format-frontend:
	cd frontend && npm run format

format-check-frontend:
	cd frontend && npm run format:check

# ── combined helpers ──────────────────────────────────────────────────────────
install: install-backend install-frontend

format: format-backend format-frontend

format-check: format-check-backend format-check-frontend

lint: format-check

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	rm -rf frontend/dist frontend/node_modules/.vite

.DEFAULT_GOAL := dev
