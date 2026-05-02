import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import httpx
import asyncio
from loguru import logger

router = APIRouter()

CALDERA_URL = os.getenv("CALDERA_URL", "http://localhost:8888")
CALDERA_API_KEY = os.getenv("CALDERA_API_KEY", "ADMIN123")

# We will use this to keep track of connected websocket clients
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
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"WebSocket send error: {e}")

manager = ConnectionManager()

# Global state for simulation
class SimulationState:
    def __init__(self):
        self.current_operation_id = None
        self.status = "idle"

sim_state = SimulationState()

class StartAttackRequest(BaseModel):
    adversary_id: str = "ransomware-healthcare-profile"
    group: str = "red_team"

@router.post("/start-attack")
async def start_attack(req: StartAttackRequest):
    """
    Start a new Caldera operation
    """
    if sim_state.status == "running":
        return {"status": "error", "message": "An attack is already running."}

    logger.info(f"Starting Caldera attack with adversary: {req.adversary_id}")
    
    headers = {
        "KEY": CALDERA_API_KEY,
        "Content-Type": "application/json"
    }
    
    # Caldera API payload to create an operation
    payload = {
        "name": "Ransomware Simulation",
        "adversary_id": req.adversary_id,
        "group": req.group,
        "planner_id": "c0e4cdd2-132d-4402-861d-72013f9f74a0", # default atomic planner
        "state": "running"
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{CALDERA_URL}/api/v2/operations", json=payload, headers=headers, timeout=10.0)
            res.raise_for_status()
            data = res.json()
            sim_state.current_operation_id = data.get("id")
            sim_state.status = "running"
            
            # Broadcast update
            await manager.broadcast('{"type": "status", "data": "running"}')
            
            return {"status": "success", "operation_id": sim_state.current_operation_id}
    except Exception as e:
        logger.error(f"Failed to start Caldera attack: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/stop-attack")
async def stop_attack():
    """
    Stop the current Caldera operation
    """
    if not sim_state.current_operation_id or sim_state.status != "running":
        # Force stop anyway just to be safe
        sim_state.status = "idle"
        await manager.broadcast('{"type": "status", "data": "idle"}')
        return {"status": "success", "message": "Attack stopped locally (was not running)."}

    logger.info(f"Stopping Caldera attack {sim_state.current_operation_id}")
    headers = {
        "KEY": CALDERA_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {"state": "stopped"}

    try:
        async with httpx.AsyncClient() as client:
            res = await client.patch(
                f"{CALDERA_URL}/api/v2/operations/{sim_state.current_operation_id}",
                json=payload,
                headers=headers,
                timeout=10.0
            )
            res.raise_for_status()
            sim_state.status = "idle"
            await manager.broadcast('{"type": "status", "data": "idle"}')
            return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to stop Caldera attack: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/status")
async def get_status():
    """
    Poll the current status of the Caldera operation
    """
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
            
            # If Caldera finished
            if op_state in ["finished", "stopped"]:
                sim_state.status = "idle"
                
            return {"status": sim_state.status, "caldera_state": op_state}
    except Exception as e:
        logger.error(f"Failed to poll Caldera status: {e}")
        return {"status": sim_state.status, "error": str(e)}

@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """
    WebSocket for streaming logs to frontend
    """
    await manager.connect(websocket)
    try:
        while True:
            # We keep the connection open and wait for client messages if any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
