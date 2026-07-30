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
	@echo ""
	@echo "$(GREEN)devdock$(NC) — Admin dashboard for devs who ship"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

# --- Docker -----------------------------------------------------------------
.PHONY: compose-up
compose-up: ## Start all services (PostgreSQL + Redis)
	@echo "$(GREEN)Starting services...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(YELLOW)Waiting for PostgreSQL...$(NC)"
	@sleep 2
	@docker exec $(DOCKER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) 2>/dev/null && \
		echo "$(GREEN)PostgreSQL is ready$(NC)" || \
		echo "$(YELLOW)PostgreSQL not ready yet$(NC)"
	@echo "$(YELLOW)Waiting for Redis...$(NC)"
	@sleep 1
	@docker exec $(REDIS_DOCKER_NAME) redis-cli ping 2>/dev/null | grep -q PONG && \
		echo "$(GREEN)Redis is ready$(NC)" || \
		echo "$(YELLOW)Redis not ready yet$(NC)"

.PHONY: compose-down
compose-down: ## Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker compose -f $(COMPOSE_FILE) down

.PHONY: compose-logs
compose-logs: ## Tail logs from all services
	docker compose -f $(COMPOSE_FILE) logs -f

.PHONY: db-up
db-up: ## Start PostgreSQL in Docker
	@echo "$(GREEN)Starting PostgreSQL...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d postgres
	@echo "$(YELLOW)Waiting for PostgreSQL...$(NC)"
	@sleep 2
	@docker exec $(DOCKER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) 2>/dev/null && \
		echo "$(GREEN)PostgreSQL is ready$(NC)" || \
		echo "$(YELLOW)PostgreSQL not ready yet$(NC)"

.PHONY: db-down
db-down: ## Stop PostgreSQL container
	@echo "$(YELLOW)Stopping PostgreSQL...$(NC)"
	docker compose -f $(COMPOSE_FILE) stop postgres

.PHONY: db-restart
db-restart: db-down db-up ## Restart PostgreSQL

.PHONY: db-logs
db-logs: ## Tail PostgreSQL logs
	docker compose -f $(COMPOSE_FILE) logs -f postgres

.PHONY: db-shell
db-shell: ## Open psql shell in the database
	@docker exec -it $(DOCKER_NAME) psql -U $(DB_USER) -d $(DB_NAME)

.PHONY: db-reset
db-reset: ## Drop and recreate the database (DESTRUCTIVE)
	@echo "$(RED)This will destroy all data. Press Ctrl+C to cancel, or wait 3s...$(NC)"
	@sleep 3
	@docker compose -f $(COMPOSE_FILE) exec postgres psql -U $(DB_USER) -c "DROP DATABASE IF EXISTS $(DB_NAME);"
	@docker compose -f $(COMPOSE_FILE) exec postgres psql -U $(DB_USER) -c "CREATE DATABASE $(DB_NAME);"
	@echo "$(GREEN)Database recreated$(NC)"

# --- Redis -------------------------------------------------------------------
.PHONY: redis-up
redis-up: ## Start Redis
	@echo "$(GREEN)Starting Redis...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d redis
	@echo "$(YELLOW)Waiting for Redis...$(NC)"
	@sleep 1
	@docker exec $(REDIS_DOCKER_NAME) redis-cli ping 2>/dev/null | grep -q PONG && \
		echo "$(GREEN)Redis is ready$(NC)" || \
		echo "$(YELLOW)Redis not ready yet$(NC)"

.PHONY: redis-down
redis-down: ## Stop Redis
	@echo "$(YELLOW)Stopping Redis...$(NC)"
	docker compose -f $(COMPOSE_FILE) stop redis

.PHONY: redis-logs
redis-logs: ## Tail Redis logs
	docker compose -f $(COMPOSE_FILE) logs -f redis

.PHONY: redis-shell
redis-shell: ## Open redis-cli
	@docker exec -it $(REDIS_DOCKER_NAME) redis-cli

# --- App --------------------------------------------------------------------
.PHONY: dev
dev: ## Start the Next.js dev server
	@echo "$(GREEN)Starting devdock...$(NC)"
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
	@echo "$(GREEN)Running migrations...$(NC)"
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
	@colima start && echo "$(GREEN)Colima started$(NC)"

.PHONY: colima-stop
colima-stop: ## Stop Colima
	@colima stop && echo "$(YELLOW)Colima stopped$(NC)"

.PHONY: colima-status
colima-status: ## Check Colima status
	@colima status

# --- Full Stack -------------------------------------------------------------
.PHONY: up
up: compose-up ## Start everything: database + Redis + dev server + worker
	@echo "$(GREEN)Starting dev server and worker...$(NC)"
	npx concurrently --names "dev,worker" --prefix-colors "blue,green" "npm run dev" "npx dotenv -e .env -- npx tsx src/worker.ts"
	@echo "$(GREEN)devdock is running at http://localhost:3000$(NC)"

.PHONY: setup
setup: ## First-time setup: install deps, generate client, run migrations, seed
	@echo "$(GREEN)Setting up devdock...$(NC)"
	npm install
	npx prisma generate
	@make compose-up
	@sleep 2
	npx prisma migrate dev --name init
	@echo "$(GREEN)Setup complete! Run 'make dev' to start$(NC)"

# --- Worker -----------------------------------------------------------------
.PHONY: worker
worker: ## Start the BullMQ workflow worker (long-running process)
	@echo "$(GREEN)Starting workflow worker...$(NC)"
	npx dotenv -e .env -- npx tsx src/worker.ts

# --- Utility ----------------------------------------------------------------
.PHONY: clean
clean: ## Remove build artifacts and node_modules
	rm -rf .next node_modules
	@echo "$(GREEN)Cleaned$(NC)"

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: env
env: ## Show current environment config
	@echo "$(GREEN)Database URL:$(NC) $(shell grep DATABASE_URL .env 2>/dev/null || echo 'not set')"
	@echo "$(GREEN)Redis URL:$(NC) redis://localhost:$(REDIS_PORT)"
	@echo "$(GREEN)PostgreSQL:$(NC) $$(docker ps --format '{{.Names}}' | grep $(DOCKER_NAME) || echo 'not running')"
	@echo "$(GREEN)Redis:$(NC) $$(docker ps --format '{{.Names}}' | grep $(REDIS_DOCKER_NAME) || echo 'not running')"
	@echo "$(GREEN)Node version:$(NC) $$(node --version)"
