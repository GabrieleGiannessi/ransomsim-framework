.PHONY: all dev api frontend up-red down-red up-blue down-blue

all: dev

api:
	@echo "Avvio API (locale)..."
	uv run uvicorn api.main:app --reload

frontend:
	@echo "Avvio frontend (locale)..."
	cd frontend && npm run dev

dev:
	@echo "Avvio API e frontend in parallelo (locale)..."
	(uv run uvicorn api.main:app --reload) & \
	(cd frontend && npm run dev) ; wait

# --- Docker Compose Commands ---

up-red:
	@echo "Avvio Red Team (Caldera)..."
	docker compose -p ransomsim-red -f infra/docker-compose.red.yaml up -d --remove-orphans

down-red:
	@echo "Arresto Red Team..."
	docker compose -p ransomsim-red -f infra/docker-compose.red.yaml down

up-blue:
	@echo "Avvio Blue Team (API, Frontend, Agent)..."
	docker compose -p ransomsim-blue -f infra/docker-compose.blue.yaml up -d --remove-orphans

down-blue:
	@echo "Arresto Blue Team..."
	docker compose -p ransomsim-blue -f infra/docker-compose.blue.yaml down
