# Requires: Node.js, Docker, make (Git Bash / WSL / choco install make)
-include .env
export

.DEFAULT_GOAL := help

.PHONY: help install install-admin build build-admin db-up db-down db-logs dev start lint test seed up reset-admin

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

seed: ## Seed the effector note (needs token, usage: TOKEN=xxx make seed)
	@echo "Seeding effector note..."
	curl -sf -X POST http://localhost:$(PORT)/api/notes \
	  -H "Content-Type: application/json" \
	  -H "x-admin-token: $(TOKEN)" \
	  -d @seed/effector-note.json \
	  && echo " ✓ Seeded" || echo " ✗ Failed — is the backend running? Usage: TOKEN=<token from admin localStorage> make seed"

up: db-up ## Start DB and then dev server (blocks)
	npm run start:dev

reset-admin: ## Break glass: wipe admin password, authenticator and passkeys in prod (back to admin123)
	@read -p "This wipes the PROD admin password, authenticator and passkeys (back to admin123). Type 'reset' to continue: " ans && [ "$$ans" = "reset" ]
	kubectl exec -n sskd deployment/sskd-postgres -- \
	  psql -U postgres -d senior_script_kiddie \
	  -c 'DELETE FROM admin_sessions; DELETE FROM admin_passkeys; DELETE FROM admin_account;'
	kubectl rollout restart -n sskd deployment/sskd-backend
