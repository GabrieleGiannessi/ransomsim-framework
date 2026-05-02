import os
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import httpx
from loguru import logger

router = APIRouter()

CALDERA_URL = os.getenv("CALDERA_URL", "http://localhost:8888")
CALDERA_API_KEY = os.getenv("CALDERA_API_KEY", "ADMIN123")

ADVERSARY_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"WebSocket send error: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


class SimulationState:
    def __init__(self):
        self.current_operation_id = None
        self.status = "idle"
        self._lock = asyncio.Lock()


sim_state = SimulationState()


class StartAttackRequest(BaseModel):
    adversary_id: str = ADVERSARY_ID
    group: str = "red_team"


@router.post("/start-attack")
async def start_attack(req: StartAttackRequest):
    """Start a new Caldera operation."""
    async with sim_state._lock:
        if sim_state.status == "running":
            return {"status": "error", "message": "An attack is already running."}
        sim_state.status = "running"

    logger.info(f"Starting Caldera attack with adversary: {req.adversary_id}")

    headers = {
        "KEY": CALDERA_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "name": "Ransomware Simulation",
        "adversary": {"adversary_id": req.adversary_id},  
        "group": req.group,
        "planner": {"id": "c0e4cdd2-132d-4402-861d-72013f9f74a0"},
        "state": "running"
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{CALDERA_URL}/api/v2/operations",
                json=payload,
                headers=headers,
                timeout=10.0
            )
            res.raise_for_status()
            data = res.json()
            sim_state.current_operation_id = data.get("id")

            await manager.broadcast(json.dumps({"type": "status", "data": "running"}))
            return {"status": "success", "operation_id": sim_state.current_operation_id}

    except Exception as e:
        sim_state.status = "idle"
        logger.error(f"Failed to start Caldera attack: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/stop-attack")
async def stop_attack():
    if not sim_state.current_operation_id or sim_state.status != "running":
        sim_state.status = "idle"
        await manager.broadcast(json.dumps({"type": "status", "data": "idle"}))
        return {"status": "success", "message": "Not running."}

    headers = {"KEY": CALDERA_API_KEY, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{CALDERA_URL}/api/v2/operations/{sim_state.current_operation_id}",
                headers=headers, timeout=5.0
            )
            current_state = res.json().get("state", "")

            if current_state not in ["finished", "stopped"]:
                await client.patch(
                    f"{CALDERA_URL}/api/v2/operations/{sim_state.current_operation_id}",
                    json={"state": "stopped"},
                    headers=headers, timeout=10.0
                )

        sim_state.status = "idle"
        await manager.broadcast(json.dumps({"type": "status", "data": "idle"}))
        return {"status": "success"}

    except Exception as e:
        logger.error(f"Failed to stop Caldera attack: {e}")
        sim_state.status = "idle"  
        return {"status": "error", "message": str(e)}

@router.get("/status")
async def get_status():
    """Poll the current status of the Caldera operation."""
    if not sim_state.current_operation_id:
        return {"status": "idle"}

    headers = {
        "KEY": CALDERA_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{CALDERA_URL}/api/v2/operations/{sim_state.current_operation_id}",
                headers=headers,
                timeout=5.0
            )
            res.raise_for_status()
            data = res.json()
            op_state = data.get("state", "idle")

            if op_state in ["finished", "stopped"]:
                sim_state.status = "idle"

            return {"status": sim_state.status, "caldera_state": op_state}

    except Exception as e:
        logger.error(f"Failed to poll Caldera status: {e}")
        return {"status": sim_state.status, "error": str(e)}


@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket for streaming logs to frontend."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)