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

## Simulation Modes

The framework supports two simulation modes:

| Mode | Command | Description |
|------|---------|-------------|
| **Split** | `make up-red` / `make up-blue` | Original two-machine setup |
| **Full Simulation** | `make up-fullsim` | Realistic multi-subnet scenario on a single host |

---

## Mode 1: Split Architecture (Original)

Designed to run across two separate machines (Red Team on Linux, Blue Team on Windows).

1. Clone the repository on **both** machines:
```bash
git clone https://github.com/GabrieleGiannessi/ransomsim-framework.git
cd ransomsim-framework
```

2. Configure the environments:
Copy the example environment file and update it with the IPs of your virtual machines.
```bash
cp .env.example .env
```
Edit `.env` and configure `CALDERA_URL` (Red Team IP) and `VITE_API_URL` (Blue Team IP). This step is mandatory for the Blue Team machine to successfully reach the C2 server, and for the attacker's browser to reach the Blue Team API.

### Starting the Simulation

**On the Red Team Machine (Linux):**
This will start the MITRE Caldera C2 server.
```bash
make up-red
```

**On the Blue Team Machine (Windows):**
This will start the simulated healthcare database, the FastAPI backend, the React frontend, and the target Caldera agent.
```bash
make up-blue
```
**Note**: On first boot, Caldera takes 1–3 minutes to compile the sandcat agent. The Blue Team agent container will retry automatically until the agent binary is available from the Red Team machine.

### Accessing the Interfaces

- **Blue Team (Hospital UI)**: Open `http://localhost:5173/` on the Windows machine to view the healthcare database.
- **Blue Team (SOC Dashboard)**: Open `http://localhost:5173/blue-team` on the Windows machine.
- **Red Team (Attacker Panel)**: Open `http://<BLUE_TEAM_IP>:5173/red` from the Linux machine browser to launch and monitor the attack.

### Stopping the Simulation

To stop the containers on their respective machines:
```bash
make down-red   # On the Red Team machine
make down-blue  # On the Blue Team machine
```

---

## Mode 2: Full Simulation (Realistic Multi-Subnet)

A single-host deployment with **three isolated Docker networks** that simulate a realistic enterprise environment with a firewall/router separating attacker, DMZ, and internal networks.

### Network Architecture

```
                        +-----------+
                        |  ROUTER   |
                        | (iptables)|
                        +-----+-----+
                              |
            +-----------------+-----------------+
            |                 |                 |
    +-------+------+  +------+-------+  +------+-------+
    | ATTACK NET   |  | DMZ NET      |  | INTERNAL NET |
    | 10.10.1.0/24 |  | 10.10.2.0/24 |  | 10.10.3.0/24 |
    |              |  |              |  |              |
    | - Caldera C2 |  | - Nginx      |  | - FastAPI    |
    | - Kali Box   |  |   Reverse    |  | - Healthcare |
    |   (nmap,     |  |   Proxy      |  |   Database   |
    |    hydra,    |  | - Frontend   |  |              |
    |    nikto)    |  | - SSH Target |  |              |
    +--------------+  +--------------+  +--------------+
```

### Firewall Rules

The router container enforces these iptables rules:

| Source | Destination | Allowed | Blocked |
|--------|------------|---------|---------|
| Attack Net | DMZ | Ports 80, 443 | Everything else |
| Attack Net | Internal | — | All traffic |
| DMZ | Internal | Port 8000 (API) | Everything else |
| Internal | DMZ | Established connections | — |

The attacker **cannot** reach the internal network directly — they must first compromise a DMZ service and pivot.

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

- **Hospital UI**: `http://localhost/` (through the Nginx reverse proxy)
- **SOC Dashboard**: `http://localhost/blue-team`
- **Red Team Panel**: `http://localhost/red`
- **Caldera C2**: `http://localhost:8888`
- **Attacker Shell**: `make attacker-shell`

### Stopping the Full Simulation

```bash
make down-fullsim
```
