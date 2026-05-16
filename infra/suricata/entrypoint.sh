#!/bin/sh
# Suricata Entrypoint — RansomSim Blue Team
# Avvia Suricata in modalità IDS e fa polling periodico dei log eve.json
# per inviarli all'API del blue team come alert sulla dashboard.

set -e

API_URL="${API_URL:-http://api:8000}"
LOG_FILE="/var/log/suricata/eve.json"
POLL_INTERVAL="${SURICATA_POLL_INTERVAL:-15}"   # secondi tra ogni polling
LAST_POS_FILE="/tmp/suricata_eve_pos"            # posizione ultimo byte letto

echo "[entrypoint] Starting Suricata IDS Blue Team integration..."
echo "[entrypoint] API endpoint: $API_URL"
echo "[entrypoint] Log polling interval: ${POLL_INTERVAL}s"

# Installa dipendenze se necessario
if ! command -v curl > /dev/null 2>&1; then
    echo "[entrypoint] Installing curl..."
    apt-get update -qq && apt-get install -y -qq curl > /dev/null 2>&1
fi

# Crea la directory dei log se non esiste
mkdir -p /var/log/suricata

# Avvia Suricata in background
# Se SURICATA_IFACE è "any", usiamo la config multi-interfaccia dello yaml
if [ "$SURICATA_IFACE" = "any" ] || [ -z "$SURICATA_IFACE" ]; then
    echo "[entrypoint] Launching Suricata on ALL interfaces (from yaml config)..."
    suricata -c /etc/suricata/suricata.yaml --pidfile /var/run/suricata.pid &
else
    echo "[entrypoint] Launching Suricata on specific interface ${SURICATA_IFACE}..."
    suricata -c /etc/suricata/suricata.yaml -i "$SURICATA_IFACE" --pidfile /var/run/suricata.pid &
fi
SURICATA_PID=$!

# Attendi che il log file esista
echo "[entrypoint] Waiting for eve.json to be created..."
RETRIES=0
until [ -f "$LOG_FILE" ] || [ $RETRIES -ge 30 ]; do
    sleep 2
    RETRIES=$((RETRIES + 1))
done

if [ ! -f "$LOG_FILE" ]; then
    echo "[entrypoint] WARNING: eve.json not created after 60s. Suricata may have issues."
else
    echo "[entrypoint] eve.json found. Starting log tail loop."
fi

# Inizializza la posizione di lettura a fine file (legge solo i nuovi eventi)
wc -c "$LOG_FILE" 2>/dev/null | awk '{print $1}' > "$LAST_POS_FILE" 2>/dev/null || echo "0" > "$LAST_POS_FILE"


# Loop di polling: legge i nuovi alert dall'eve.json e li invia all'API
while true; do
    sleep "$POLL_INTERVAL"

    if [ ! -f "$LOG_FILE" ]; then
        echo "[poller] eve.json not found, skipping."
        continue
    fi

    # Leggi solo le righe nuove dall'ultima posizione
    LAST_POS=$(cat "$LAST_POS_FILE" 2>/dev/null || echo "0")
    CURRENT_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null || echo "0")

    # Se il file è stato ruotato (dimensione < ultima posizione), resetta
    if [ "$CURRENT_SIZE" -lt "$LAST_POS" ]; then
        echo "[poller] Log rotation detected, resetting position."
        LAST_POS=0
    fi

    if [ "$CURRENT_SIZE" -le "$LAST_POS" ]; then
        # Nessun nuovo dato
        continue
    fi

    # Estrai solo le nuove righe
    NEW_LINES=$(tail -c "+$((LAST_POS + 1))" "$LOG_FILE" 2>/dev/null | head -c 65536)

    # Aggiorna la posizione
    echo "$CURRENT_SIZE" > "$LAST_POS_FILE"

    # Filtra solo gli eventi di tipo "alert" e "anomaly"
    ALERTS=$(echo "$NEW_LINES" | grep -E '"event_type":"(alert|anomaly)"' || true)

    if [ -z "$ALERTS" ]; then
        continue
    fi

    # Invia ogni alert singolarmente all'API
    echo "$ALERTS" | while IFS= read -r line; do
        if [ -z "$line" ]; then
            continue
        fi

        # POST verso l'endpoint /alerts/ingest dell'API blue team
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -d "$line" \
            "$API_URL/alerts/ingest" 2>/dev/null || echo "000")

        if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "201" ]; then
            echo "[poller] WARNING: Failed to POST alert to API (HTTP $HTTP_STATUS)"
        fi
    done

    echo "[poller] Processed new Suricata events at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
done &

# Resta in foreground finché Suricata è in esecuzione
wait $SURICATA_PID
