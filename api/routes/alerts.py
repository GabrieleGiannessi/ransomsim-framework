# Alerts Router — RansomSim Blue Team
# Riceve gli alert Suricata via POST e li serve alla dashboard via:
#   - REST: GET /alerts/
#   - WebSocket: ws://api/alerts/ws  (push real-time)

import json
from typing import Optional, List
from datetime import datetime
from collections import deque

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from loguru import logger

router = APIRouter(prefix="/alerts", tags=["alerts"])

# In-memory store (ring buffer: ultimi MAX_ALERTS alert)
MAX_ALERTS = 500
_alert_store: deque = deque(maxlen=MAX_ALERTS)


# WebSocket manager (stesso pattern del modulo simulation)
class AlertConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"[alerts-ws] New client connected. Total: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info(f"[alerts-ws] Client disconnected. Total: {len(self.active)}")

    async def broadcast(self, message: str):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = AlertConnectionManager()


# Modelli dati inline
def _parse_eve_alert(raw: dict) -> dict:
    """Normalizza un evento EVE JSON di Suricata in un alert per la dashboard."""
    alert_info = raw.get("alert", {})
    src_ip = raw.get("src_ip", "unknown")
    dest_ip = raw.get("dest_ip", "unknown")
    proto = raw.get("proto", "unknown")
    event_type = raw.get("event_type", "alert")

    # Calcola la severity come stringa leggibile
    severity_code = alert_info.get("severity", 3)
    severity_map = {1: "high", 2: "medium", 3: "low"}
    severity = severity_map.get(severity_code, "info")

    return {
        "id": raw.get("flow_id", id(raw)),
        "timestamp": raw.get("timestamp", datetime.utcnow().isoformat()),
        "event_type": event_type,
        "severity": severity,
        "signature": alert_info.get(
            "signature", raw.get("anomaly", {}).get("type", "unknown")
        ),
        "signature_id": alert_info.get("signature_id", 0),
        "category": alert_info.get("category", "anomaly"),
        "src_ip": src_ip,
        "src_port": raw.get("src_port"),
        "dest_ip": dest_ip,
        "dest_port": raw.get("dest_port"),
        "proto": proto,
        "action": alert_info.get("action", "allowed"),
        "payload_printable": alert_info.get("payload_printable", ""),
        "http": raw.get("http", {}),
        "dns": raw.get("dns", {}),
        "tls": raw.get("tls", {}),
        "ssh": raw.get("ssh", {}),
        "raw": raw,
    }


# Endpoints REST
@router.post("/ingest", status_code=201)
async def ingest_alert(body: dict):
    """
    Riceve un singolo evento EVE JSON da Suricata (chiamato dall'entrypoint.sh).
    Filtra solo alert e anomaly, li normalizza e li salva nello store.
    Fa anche broadcast real-time via WebSocket verso la dashboard.
    """
    event_type = body.get("event_type", "")
    # Scartiamo eventi tecnici (flow, stats, decoder anomalies) per evitare rumore.
    # Accettiamo solo alert reali o anomalie con firma specifica.
    if event_type != "alert":
        if event_type == "anomaly" and body.get("anomaly", {}).get("type") != "decode":
            # Passa se è un'anomalia interessante ma non di puro decoding
            pass
        else:
            return {"status": "ignored", "event_type": event_type}

    alert = _parse_eve_alert(body)
    _alert_store.append(alert)

    logger.info(
        f"[suricata-alert] {alert['severity'].upper()} | {alert['signature']} "
        f"| {alert['src_ip']} -> {alert['dest_ip']}"
    )

    # Push real-time alla dashboard
    await manager.broadcast(json.dumps(alert))

    return {"status": "ok", "alert_id": alert["id"]}


@router.get("/")
async def list_alerts(
    limit: int = Query(default=50, ge=1, le=500),
    severity: Optional[str] = Query(
        default=None, description="Filtra per severity: high|medium|low|info"
    ),
    event_type: Optional[str] = Query(
        default=None, description="Filtra per tipo: alert|anomaly"
    ),
):
    """
    Restituisce gli ultimi alert Suricata (ordinati dal più recente).
    Supporta filtri per severity e event_type.
    """
    alerts = list(reversed(list(_alert_store)))

    if severity:
        alerts = [a for a in alerts if a["severity"] == severity.lower()]
    if event_type:
        alerts = [a for a in alerts if a["event_type"] == event_type.lower()]

    return {
        "total": len(alerts),
        "alerts": alerts[:limit],
    }


@router.get("/stats")
async def alert_stats():
    """Ritorna statistiche aggregate degli alert (conteggi per severity/category)."""
    all_alerts = list(_alert_store)
    stats = {
        "total": len(all_alerts),
        "by_severity": {"high": 0, "medium": 0, "low": 0, "info": 0},
        "by_category": {},
        "by_src_ip": {},
        "recent_signatures": [],
    }

    sig_count: dict = {}
    for a in all_alerts:
        sev = a.get("severity", "info")
        stats["by_severity"][sev] = stats["by_severity"].get(sev, 0) + 1

        cat = a.get("category", "unknown")
        stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1

        src = a.get("src_ip", "unknown")
        stats["by_src_ip"][src] = stats["by_src_ip"].get(src, 0) + 1

        sig = a.get("signature", "")
        sig_count[sig] = sig_count.get(sig, 0) + 1

    # Top 10 firme più frequenti
    stats["recent_signatures"] = sorted(
        [{"signature": k, "count": v} for k, v in sig_count.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    return stats


@router.delete("/")
async def clear_alerts():
    """Svuota lo store degli alert (utile per reset della simulazione)."""
    _alert_store.clear()
    logger.info("[alerts] Alert store cleared.")
    return {"status": "cleared"}


@router.websocket("/ws")
async def alerts_websocket(ws: WebSocket):
    """
    WebSocket per aggiornamenti real-time degli alert Suricata.
    La dashboard blue team si connette qui.
    Al momento della connessione, invia l'ultimo snapshot degli alert.
    """
    await manager.connect(ws)
    try:
        # Invia snapshot iniziale
        snapshot = list(reversed(list(_alert_store)))[:50]
        await ws.send_text(json.dumps({"type": "snapshot", "alerts": snapshot}))

        # Tieni viva la connessione
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(ws)
