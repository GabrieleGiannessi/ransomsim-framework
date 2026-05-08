"""
Intentionally vulnerable API endpoints for ransomware attack simulation.

WARNING: These endpoints contain REAL vulnerabilities (command injection, SQL injection).
They are gated behind the SIMULATION_MODE environment variable and must NEVER be
enabled in any production or internet-facing environment.
"""

import os
import subprocess
import sqlite3

from fastapi import APIRouter

router = APIRouter(prefix="/legacy", tags=["legacy-vulnerable"])

SIMULATION_MODE = os.getenv("SIMULATION_MODE", "false").lower() == "true"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "healthcare.db")


@router.get("/ping")
def legacy_ping(host: str = "localhost"):
    """Simulates a legacy diagnostics endpoint with command injection (T1190)."""
    if not SIMULATION_MODE:
        return {"error": "Endpoint disabled. Set SIMULATION_MODE=true to enable."}

    try:
        result = subprocess.run(
            f"ping -c 1 {host}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return {"output": result.stdout, "error": result.stderr}
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out"}


@router.get("/search")
def legacy_search(q: str = ""):
    """Simulates a legacy search endpoint with SQL injection (T1190)."""
    if not SIMULATION_MODE:
        return {"error": "Endpoint disabled. Set SIMULATION_MODE=true to enable."}

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM patients WHERE name LIKE '%{q}%'")  # noqa: S608
        results = cursor.fetchall()
        conn.close()
        return {"results": results, "count": len(results)}
    except Exception as e:
        return {"error": str(e)}
