.PHONY: all dev api frontend

all: dev

api:
	@echo "Avvio API..."
	uv run uvicorn api.main:app --reload

frontend:
	@echo "Avvio frontend..."
	cd frontend && uv run npm run dev

dev:
	@echo "Avvio API e frontend in parallelo..."
	(uv run uvicorn api.main:app --reload) & \
	(cd frontend && uv run npm run dev) ; wait
