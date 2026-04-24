from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import patients
from api.database import SessionLocal
from api.services import db_init
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    db = SessionLocal()
    try:
        db_init.init_db(db)
    finally:
        db.close()
    yield

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

@app.get("/")
def root():
    return {"message": "Welcome to the Healthcare API. Go to /docs for Swagger UI."}
