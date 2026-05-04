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

## Quickstart

The framework is designed to run in a split architecture, simulating a real-world scenario with an attacker machine (Red Team) and a target machine (Blue Team).

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