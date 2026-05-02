from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import patients, simulation
from api.database import SessionLocal
from api.services import db_init
from contextlib import asynccontextmanager
from loguru import logger
import sys
import json
import asyncio

# Setup Loguru with JSON structured logging
logger.remove()
logger.add(sys.stdout, format="{message}", serialize=True, level="INFO")

# Custom sink to broadcast logs via WebSocket
class WebSocketLogSink:
    def write(self, message):
        # Fire and forget broadcast
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(simulation.manager.broadcast(message))
        except RuntimeError:
            pass # No running event loop

logger.add(WebSocketLogSink(), format="{message}", serialize=True, level="INFO")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up API and initializing database...")
    db = SessionLocal()
    try:
        db_init.init_db(db)
    finally:
        db.close()
    yield
    logger.info("Shutting down API...")

app = FastAPI(
    title="Healthcare API",
    description="RESTful API for Healthcare Dataset",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(simulation.router, prefix="/sim", tags=["simulation"])

@app.get("/")
def root():
    logger.info("Root endpoint accessed")
    return {"message": "Welcome to the Healthcare API. Go to /docs for Swagger UI."}
