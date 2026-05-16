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

# Docker Compose Commands
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

reset-blue: down-blue
	@echo "Resetting Healthcare Database..."
	rm -f healthcare.db
	$(MAKE) up-blue

# Full Simulation Mode (realistic multi-subnet scenario)
up-fullsim:
	@echo "Avvio simulazione completa (3 subnet + Suricata IDS)..."
	docker compose -p ransomsim-full -f infra/docker-compose.full-sim.yaml up -d --remove-orphans
	@echo "Verifica stato Suricata..."
	@sleep 2
	@docker ps --filter "name=sim_suricata"

down-fullsim:
	@echo "Arresto simulazione completa..."
	docker compose -p ransomsim-full -f infra/docker-compose.full-sim.yaml down

reset-fullsim: down-fullsim
	@echo "Resetting Healthcare Database..."
	rm -f healthcare.db
	$(MAKE) up-fullsim

reset-hard:
	@echo "Hard reset: container, volumi, DB e artefatti git..."
	docker compose -p ransomsim-full -f infra/docker-compose.full-sim.yaml down -v --remove-orphans
	docker compose -p ransomsim-red  -f infra/docker-compose.red.yaml down -v --remove-orphans
	rm -f healthcare.db
	git checkout -- .
	git clean -fd --exclude=".env"
	@echo "Reset completo. Riavvia con: make up-fullsim"

attacker-shell:
	@echo "Accesso alla shell dell'attaccante..."
	docker exec -it sim_attacker /bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# SURICATA IDS AUTOMATION
# ─────────────────────────────────────────────────────────────────────────────

suricata-logs:
	@echo "Tailing Suricata EVE alerts (JSON)..."
	docker exec -it sim_suricata tail -f /var/log/suricata/eve.json | grep --line-buffered '"event_type":"alert"'

suricata-stats:
	@echo "Statistiche di traffico Suricata..."
	docker exec -it sim_suricata tail -n 50 /var/log/suricata/stats.log

suricata-reload:
	@echo "Ricaricamento regole Suricata (senza riavvio container)..."
	docker exec -it sim_suricata kill -USR2 1
	@echo "Regole ricaricate con successo."

suricata-check-net:
	@echo "Verifica visibilità interfacce nel namespace condiviso (router)..."
	docker exec -it sim_suricata ip a
	docker exec -it sim_suricata ip link show | grep promisc

suricata-alerts-raw:
	@echo "Ultime 20 rilevazioni (formato breve)..."
	docker exec -it sim_suricata tail -n 100 /var/log/suricata/fast.log
