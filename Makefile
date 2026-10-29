# ============================================================================
# devdock — Makefile
# Admin dashboard for devs who ship
# ============================================================================

# --- Configuration ----------------------------------------------------------
APP_NAME    := devdock
DB_NAME     := devdock
DB_USER     := devdock
DB_PASS     := devdock
DB_PORT     := 5432
REDIS_PORT  := 6379
DOCKER_NAME := devdock-postgres
REDIS_DOCKER_NAME := devdock-redis
COMPOSE_FILE := docker-compose.yml
CONTAINER_RUNTIME ?= docker
NODE_IMG    := node:20-alpine
PG_IMG      := postgres:16-alpine

# --- Colors -----------------------------------------------------------------
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m

# --- Help -------------------------------------------------------------------
.PHONY: help
help: ## Show this help
	@printf '%b\n' ""
	@printf '%b\n' "$(GREEN)devdock$(NC) — Admin dashboard for devs who ship"
	@printf '%b\n' ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@printf '%b\n' ""

# --- Docker -----------------------------------------------------------------
.PHONY: compose-up
compose-up: ## Start all services (PostgreSQL + Redis)
	@printf '%b\n' "$(GREEN)Starting services...$(NC)"
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) up -d
	@printf '%b\n' "$(YELLOW)Waiting for PostgreSQL...$(NC)"
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if $(CONTAINER_RUNTIME) exec $(DOCKER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; then \
			printf '%b\n' "$(GREEN)PostgreSQL is ready$(NC)"; \
			break; \
		fi; \
		if [ "$$i" -eq 10 ]; then printf '%b\n' "$(YELLOW)PostgreSQL not ready yet$(NC)"; fi; \
		sleep 1; \
	done
	@printf '%b\n' "$(YELLOW)Waiting for Redis...$(NC)"
	@for i in 1 2 3 4 5; do \
		if $(CONTAINER_RUNTIME) exec $(REDIS_DOCKER_NAME) redis-cli ping 2>/dev/null | grep -q PONG; then \
			printf '%b\n' "$(GREEN)Redis is ready$(NC)"; \
			break; \
		fi; \
		if [ "$$i" -eq 5 ]; then printf '%b\n' "$(YELLOW)Redis not ready yet$(NC)"; fi; \
		sleep 1; \
	done

.PHONY: compose-down
compose-down: ## Stop all services
	@printf '%b\n' "$(YELLOW)Stopping services...$(NC)"
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) down

.PHONY: compose-logs
compose-logs: ## Tail logs from all services
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) logs -f

.PHONY: db-up
db-up: ## Start PostgreSQL in Docker
	@printf '%b\n' "$(GREEN)Starting PostgreSQL...$(NC)"
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) up -d postgres
	@printf '%b\n' "$(YELLOW)Waiting for PostgreSQL...$(NC)"
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if $(CONTAINER_RUNTIME) exec $(DOCKER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; then \
			printf '%b\n' "$(GREEN)PostgreSQL is ready$(NC)"; \
			break; \
		fi; \
		if [ "$$i" -eq 10 ]; then printf '%b\n' "$(YELLOW)PostgreSQL not ready yet$(NC)"; fi; \
		sleep 1; \
	done

.PHONY: db-down
db-down: ## Stop PostgreSQL container
	@printf '%b\n' "$(YELLOW)Stopping PostgreSQL...$(NC)"
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) stop postgres

.PHONY: db-restart
db-restart: db-down db-up ## Restart PostgreSQL

.PHONY: db-logs
db-logs: ## Tail PostgreSQL logs
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) logs -f postgres

.PHONY: db-shell
db-shell: ## Open psql shell in the database
	@$(CONTAINER_RUNTIME) exec -it $(DOCKER_NAME) psql -U $(DB_USER) -d $(DB_NAME)

.PHONY: db-reset
db-reset: ## Drop and recreate the database (DESTRUCTIVE)
	@printf '%b\n' "$(RED)This will destroy all data. Press Ctrl+C to cancel, or wait 3s...$(NC)"
	@sleep 3
	@$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) exec postgres psql -U $(DB_USER) -c "DROP DATABASE IF EXISTS $(DB_NAME);"
	@$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) exec postgres psql -U $(DB_USER) -c "CREATE DATABASE $(DB_NAME);"
	@printf '%b\n' "$(GREEN)Database recreated$(NC)"

# --- Redis -------------------------------------------------------------------
.PHONY: redis-up
redis-up: ## Start Redis
	@printf '%b\n' "$(GREEN)Starting Redis...$(NC)"
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) up -d redis
	@printf '%b\n' "$(YELLOW)Waiting for Redis...$(NC)"
	@for i in 1 2 3 4 5; do \
		if $(CONTAINER_RUNTIME) exec $(REDIS_DOCKER_NAME) redis-cli ping 2>/dev/null | grep -q PONG; then \
			printf '%b\n' "$(GREEN)Redis is ready$(NC)"; \
			break; \
		fi; \
		if [ "$$i" -eq 5 ]; then printf '%b\n' "$(YELLOW)Redis not ready yet$(NC)"; fi; \
		sleep 1; \
	done

.PHONY: redis-down
redis-down: ## Stop Redis
	@printf '%b\n' "$(YELLOW)Stopping Redis...$(NC)"
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) stop redis

.PHONY: redis-logs
redis-logs: ## Tail Redis logs
	$(CONTAINER_RUNTIME) compose -f $(COMPOSE_FILE) logs -f redis

.PHONY: redis-shell
redis-shell: ## Open redis-cli
	@$(CONTAINER_RUNTIME) exec -it $(REDIS_DOCKER_NAME) redis-cli

# --- App --------------------------------------------------------------------
.PHONY: dev
dev: ## Start the Next.js dev server
	@printf '%b\n' "$(GREEN)Starting devdock...$(NC)"
	npm run dev

.PHONY: build
build: ## Build for production
	npm run build

.PHONY: start
start: ## Start production server (run build first)
	npm run start

.PHONY: lint
lint: ## Run ESLint
	npm run lint

# --- Database (Prisma) ------------------------------------------------------
.PHONY: db-migrate
db-migrate: ## Run pending migrations
	@printf '%b\n' "$(GREEN)Running migrations...$(NC)"
	npx prisma migrate dev

.PHONY: db-migrate-deploy
db-migrate-deploy: ## Apply migrations in production mode
	npx prisma migrate deploy

.PHONY: db-push
db-push: ## Push schema changes without creating migration
	npx prisma db push

.PHONY: db-generate
db-generate: ## Generate Prisma client
	npx prisma generate

.PHONY: db-studio
db-studio: ## Open Prisma Studio (visual DB browser)
	npx prisma studio

.PHONY: db-seed
db-seed: ## Seed the database with initial data
	npx prisma db seed

# --- Colima (macOS Docker) --------------------------------------------------
.PHONY: colima-start
colima-start: ## Start Colima (Docker runtime for macOS)
	@colima start && printf '%b\n' "$(GREEN)Colima started$(NC)"

.PHONY: colima-stop
colima-stop: ## Stop Colima
	@colima stop && printf '%b\n' "$(YELLOW)Colima stopped$(NC)"

.PHONY: colima-status
colima-status: ## Check Colima status
	@colima status

# --- Full Stack -------------------------------------------------------------
.PHONY: up
up: compose-up ## Start everything: database + Redis + dev server + worker
	@printf '%b\n' "$(GREEN)Starting dev server and worker...$(NC)"
	npx concurrently --names "dev,worker" --prefix-colors "blue,green" "npm run dev" "npx dotenv -e .env -- npx tsx src/worker.ts"
	@printf '%b\n' "$(GREEN)devdock is running at http://localhost:3000$(NC)"

.PHONY: setup
setup: ## First-time setup: install deps, generate client, run migrations, seed
	@printf '%b\n' "$(GREEN)Setting up devdock...$(NC)"
	npm install
	npx prisma generate
	@make compose-up
	@sleep 2
	npx prisma migrate dev --name init
	@printf '%b\n' "$(GREEN)Setup complete! Run 'make dev' to start$(NC)"

# --- Worker -----------------------------------------------------------------
.PHONY: worker
worker: ## Start the BullMQ workflow worker (long-running process)
	@printf '%b\n' "$(GREEN)Starting workflow worker...$(NC)"
	npx dotenv -e .env -- npx tsx src/worker.ts

# --- Utility ----------------------------------------------------------------
.PHONY: clean
clean: ## Remove build artifacts and node_modules
	rm -rf .next node_modules
	@printf '%b\n' "$(GREEN)Cleaned$(NC)"

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: env
env: ## Show current environment config
	@printf '%b\n' "$(GREEN)Database URL:$(NC) $(shell grep DATABASE_URL .env 2>/dev/null || echo 'not set')"
	@printf '%b\n' "$(GREEN)Redis URL:$(NC) redis://localhost:$(REDIS_PORT)"
	@printf '%b\n' "$(GREEN)PostgreSQL:$(NC) $$($(CONTAINER_RUNTIME) ps --format '{{.Names}}' | grep $(DOCKER_NAME) || echo 'not running')"
	@printf '%b\n' "$(GREEN)Redis:$(NC) $$($(CONTAINER_RUNTIME) ps --format '{{.Names}}' | grep $(REDIS_DOCKER_NAME) || echo 'not running')"
	@printf '%b\n' "$(GREEN)Node version:$(NC) $$(node --version)"
