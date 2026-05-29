# Requires: Node.js, Docker, make (Git Bash / WSL / choco install make)
-include .env
export

.DEFAULT_GOAL := help

.PHONY: help install install-admin build build-admin db-up db-down db-logs dev start lint test token seed up

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install API npm dependencies
	npm install

install-admin: ## Install admin-ui npm dependencies
	cd admin-ui && npm install

db-up: ## Start Postgres container (detached)
	docker compose up -d postgres

db-down: ## Stop and remove containers
	docker compose down

db-logs: ## Stream Postgres logs
	docker compose logs -f postgres

dev: ## Start backend in watch mode (dev server)
	npm run start:dev

build: ## Compile API TypeScript
	npm run build

build-admin: ## Build admin UI (Vite React app → admin-ui/dist)
	cd admin-ui && npm run build

start: ## Start compiled production build
	npm run start:prod

lint: ## Lint and auto-fix
	npm run lint

test: ## Run unit tests
	npm run test

token: ## Generate a time-limited admin token (default 24h, override: HOURS=48 make token)
	@node -e "\
	  const c = require('crypto'); \
	  const h = parseInt(process.env.HOURS || '24', 10); \
	  const t = c.randomBytes(16).toString('hex'); \
	  const exp = Date.now() + h * 3600 * 1000; \
	  require('fs').writeFileSync('.admin-token', JSON.stringify({token:t,expiresAt:exp})); \
	  console.log(''); \
	  console.log('  Token : ' + t); \
	  console.log('  Expiry: ' + new Date(exp).toLocaleString() + ' (' + h + 'h)'); \
	  console.log(''); \
	  console.log('  Open /admin in the browser and paste the token.'); \
	  console.log('');"

seed: ## Seed the effector note (needs token, usage: TOKEN=xxx make seed)
	@echo "Seeding effector note..."
	curl -sf -X POST http://localhost:$(PORT)/api/notes \
	  -H "Content-Type: application/json" \
	  -H "x-admin-token: $(TOKEN)" \
	  -d @seed/effector-note.json \
	  && echo " ✓ Seeded" || echo " ✗ Failed — is the backend running? Usage: TOKEN=<token> make seed"

up: db-up ## Start DB and then dev server (blocks)
	npm run start:dev
