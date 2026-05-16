#!/bin/sh
# Suricata Entrypoint — RansomSim Blue Team
# Avvia Suricata in modalità IDS e fa polling periodico dei log eve.json
# per inviarli all'API del blue team come alert sulla dashboard.
#
# NOTA: set -e è volutamente assente — grep restituisce exit code 1 quando
# non trova corrispondenze, il che sotto set -e farebbe crashare il loop.

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

# Avvia Suricata IN BACKGROUND
# Se SURICATA_IFACE è "any" o non impostata, usa la config multi-interfaccia
if [ "$SURICATA_IFACE" = "any" ] || [ -z "$SURICATA_IFACE" ]; then
    echo "[entrypoint] Launching Suricata on ALL interfaces (from yaml config)..."
    suricata -c /etc/suricata/suricata.yaml --pidfile /var/run/suricata.pid &
else
    echo "[entrypoint] Launching Suricata on specific interface ${SURICATA_IFACE}..."
    suricata -c /etc/suricata/suricata.yaml -i "$SURICATA_IFACE" --pidfile /var/run/suricata.pid &
fi
SURICATA_PID=$!

# Attendi che il log file esista (max 60s)
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
echo "0" > "$LAST_POS_FILE"

# Loop di polling IN FOREGROUND — invia nuovi alert all'API
# Il loop gira in primo piano; Suricata gira in background con $SURICATA_PID
while true; do
    sleep "$POLL_INTERVAL"

    if [ ! -f "$LOG_FILE" ]; then
        echo "[poller] eve.json not found, skipping."
        continue
    fi

    # FIX: trim degli spazi dal risultato di wc -c per evitare errori aritmetici
    LAST_POS=$(cat "$LAST_POS_FILE" 2>/dev/null | tr -d ' ' || echo "0")
    CURRENT_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null | tr -d ' ' || echo "0")

    # Se il file è stato ruotato (dimensione < ultima posizione), resetta
    if [ "$CURRENT_SIZE" -lt "$LAST_POS" ] 2>/dev/null; then
        echo "[poller] Log rotation detected, resetting position."
        LAST_POS=0
    fi

    if [ "$CURRENT_SIZE" -le "$LAST_POS" ] 2>/dev/null; then
        # Nessun nuovo dato
        continue
    fi

    # Estrai solo le righe nuove (max 256KB per ciclo per sicurezza)
    NEW_LINES=$(tail -c "+$((LAST_POS + 1))" "$LOG_FILE" 2>/dev/null | head -c 262144)

    # Aggiorna la posizione PRIMA dell'invio (evita duplicati in caso di errore)
    echo "$CURRENT_SIZE" > "$LAST_POS_FILE"

    # Filtra solo gli eventi di tipo "alert" — grep restituisce 1 se non trova nulla, gestito con ||
    ALERTS=$(echo "$NEW_LINES" | grep -F '"event_type":"alert"') || ALERTS=""

    if [ -z "$ALERTS" ]; then
        continue
    fi

    echo "[poller] Found $(echo "$ALERTS" | wc -l | tr -d ' ') new alert(s), forwarding to API..."

    # Invia ogni alert singolarmente all'API
    echo "$ALERTS" | while IFS= read -r line; do
        [ -z "$line" ] && continue

        # POST verso l'endpoint /alerts/ingest dell'API blue team
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -d "$line" \
            "$API_URL/alerts/ingest" 2>/dev/null) || HTTP_STATUS="000"

        if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "201" ]; then
            echo "[poller] WARNING: Failed to POST alert (HTTP $HTTP_STATUS)"
        fi
    done

    echo "[poller] Cycle complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
done

# Il loop in foreground non arriverà qui finché non viene interrotto.
# Attendi Suricata solo se il loop termina per qualche motivo.
wait $SURICATA_PID
