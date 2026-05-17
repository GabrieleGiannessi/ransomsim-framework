[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/GabrieleGiannessi/ransomsim-framework)

# SEC4H project - ransomware attack scenario

A research framework for simulating ransomware attacks against healthcare systems. It combines a MITRE Caldera C2 server, a FastAPI backend with a simulated healthcare database, and a React/Vite frontend for orchestrating and monitoring attack simulations in real time.

## Disclaimer

⚠️ For research and educational use only. Do not deploy in production or against real systems.

## Requirements

This project uses [`uv`](https://docs.astral.sh/uv/) for dependency management.

If you don't have it installed, follow the [official installation guide](https://docs.astral.sh/uv/getting-started/installation/).


## Dependencies

Once `uv` is installed, sync the project dependencies by running:

```bash
uv sync
```

---

## Network Architecture & Topology

The framework is deployed as a single-host, multi-container environment featuring **three isolated Docker networks** interconnected by a dedicated **Router/Firewall container**. This architecture accurately replicates a realistic healthcare enterprise network, complete with a public-facing DMZ and a protected internal segment. 

It includes a real-time **Suricata IDS** sniffing core transit traffic and a secure **C2 DNAT Bypass** to route agent communications robustly.

### Network Architecture

```
                                 +-----------------------------+
                                 |         SIM_ROUTER          |
                                 |   +---------------------+   |
                                 |   |  Subnet-based       |   |
                                 |   |  iptables Firewall  |   |
                                 |   +----------+----------+   |
                                 |              |              |
                                 |   +----------v----------+   |
                                 |   |    Suricata IDS     |   |
                                 |   | (Shared Net Namespace)| |
                                 |   +---------------------+   |
                                 +--------------+--------------+
                                                |
                               +----------------+----------------+
                               |                                 |
                 +-------------v-------------+     +-------------v-------------+
                 |        ATTACK NET         |     |          DMZ NET          |
                 |       10.10.1.0/24        |     |       10.10.2.0/24        |
                 +---------------------------+     +---------------------------+
                 | - Caldera C2 (10.10.1.10) |     | - Nginx Reverse Proxy     |
                 | - Kali Box   (10.10.1.20) |     | - Frontend UI             |
                 +---------------------------+     | - SSH Target              |
                                                   +-------------+-------------+
                                                                 |
                                                   +-------------v-------------+
                                                   |       INTERNAL NET        |
                                                   |       10.10.3.0/24        |
                                                   +---------------------------+
                                                   | - FastAPI Backend (API)   |
                                                   | - Healthcare DB           |
                                                   | - Sandcat C2 Agent        |
                                                   +---------------------------+
```

### Core Architecture Features

1. **Suricata IDS Core Gateway Placement**:
   - The **Suricata IDS** container shares the **network namespace** of the `sim_router` (`network_mode: "service:router"`).
   - This provides the IDS with absolute, transparent visibility into all three network subnets (Attack, DMZ, and Internal) at the exact point of routing.
   - It captures all scanning, exploitation, and C2 exfiltration attempts. Alerts are outputted to `/var/log/suricata/eve.json` and ingested in real time by the FastAPI backend to populate the SOC dashboard.

2. **Robust Subnet-Based Firewall (Docker-Safe)**:
   - Docker interface names (`eth0`, `eth1`, `eth2`) can shuffle dynamically across container recreation.
   - To prevent firewall rule mismatches, the router uses **100% subnet-based `iptables` rules** mapped to exact IP ranges (`10.10.1.0/24`, `10.10.2.0/24`, `10.10.3.0/24`), ensuring absolute durability and robust network security.

3. **C2 Routing Bypass via Router DNAT**:
   - Docker implements strict inter-bridge isolation rules on the host (`DOCKER-ISOLATION-STAGE-2`), dropping Layer 2 packets that attempt to cross different user-defined bridges (e.g. from `internal_net` directly to `attack_net`).
   - To bypass this without compromising network isolation, the router implements **Destination NAT (DNAT / Port Forwarding)** on its internal IP:
     - The Sandcat agent connects to **`http://10.10.3.254:8888`** (the router gateway).
     - The router DNAT rule transparently rewrites the destination to **`10.10.1.10:8888`** (Caldera C2).
     - This forces all C2 packets to be routed locally through the gateway (allowing Suricata to analyze them) and prevents host-level drops.

---

### Firewall Rules (Subnet-Based)

The router container enforces the following strict security boundaries:

| Source Subnet | Destination Subnet | Protocol & Ports | Action | Description |
|---------------|-------------------|------------------|--------|-------------|
| **Attack Net** (`10.10.1.0/24`) | **DMZ Net** (`10.10.2.0/24`) | TCP 80, 443 | **ACCEPT** | Allows attacker to access public web services. |
| **Attack Net** (`10.10.1.0/24`) | **Internal Net** (`10.10.3.0/24`) | Any | **DROP** | Direct attacker access to internal network is completely blocked. |
| **DMZ Net** (`10.10.2.0/24`) | **Internal Net** (`10.10.3.0/24`) | TCP 8000 (API) | **ACCEPT** | Allows Nginx/Frontend to query the healthcare API backend. |
| **Internal Net** (`10.10.3.0/24`) | **Attack Net** (`10.10.1.0/24`) | TCP 8888 (C2) | **ACCEPT** | Allows Sandcat Agent to establish C2 channel to Caldera. |
| **Internal Net** (`10.10.3.0/24`) | **Attack Net** (`10.10.1.0/24`) | Any | **DROP** | Blocks any other outbound internal traffic. |

---

### Kill Chain (MITRE ATT&CK)

The full simulation adversary profile executes these phases in order:

| # | Phase | Ability | MITRE Technique |
|---|-------|---------|----------------|
| 1 | Reconnaissance | `recon-nmap-scan` | T1595.001 - Active Scanning |
| 2 | Reconnaissance | `recon-vuln-scan` | T1595.002 - Vulnerability Scanning |
| 3 | Initial Access | `initial-access-exploit-api` | T1190 - Exploit Public-Facing App |
| 4 | Discovery | `discovery-enum-api` | T1046 - Network Service Discovery |
| 5 | Collection | `collection-dump-db` | T1560 - Archive Collected Data |
| 6 | Exfiltration | `exfil-c2-channel` | T1041 - Exfiltration Over C2 |
| 7 | Persistence | `persist-cron-backdoor` | T1053.003 - Cron Job |
| 8 | Impact | `impact-sim-encrypt` | T1486 - Data Encrypted for Impact |

### Vulnerable Endpoints

The API includes intentionally vulnerable endpoints gated behind the `SIMULATION_MODE=true` environment variable:

- **`GET /legacy/ping?host=<input>`** — Command injection (T1190). Input is passed unsanitized to a shell `ping` command.
- **`GET /legacy/search?q=<input>`** — SQL injection (T1190). Input is concatenated directly into a SQL query.

⚠️ These endpoints return an error response when `SIMULATION_MODE` is not `true`. **Never enable them on internet-facing systems.**

### Additional Attack Vectors

- **SSH Target** (`10.10.2.40`): An SSH server with weak credentials (`admin` / `hospital2024`) for brute-force simulation via Hydra.
- **Traffic Generator**: A container that produces realistic background HTTP traffic to make attack detection more challenging.

### Starting the Full Simulation

```bash
make up-fullsim
```

### Accessing the Interfaces

- **Hospital UI**: `http://localhost:80/` (through the Nginx reverse proxy)
- **SOC Dashboard**: `http://localhost:80/blue-team`
- **Red Team Panel**: `http://localhost:80/red`
- **Caldera C2**: `http://localhost:8888`
- **Attacker Shell**: `make attacker-shell`

### Stopping the Full Simulation

```bash
make down-fullsim
```
