# SEC4H project - ransomware attack scenario

A research framework for simulating ransomware attacks against healthcare systems. It combines a MITRE Caldera C2 server, a FastAPI backend with a simulated healthcare database, and a React/Vite frontend for orchestrating and monitoring attack simulations in real time.

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

1. Clone the repository: 
```bash
git clone https://github.com/GabrieleGiannessi/ransomsim-framework.git
cd ransomsim-framework
```

2. Start the stack

Run from the infra/ directory:
```bash
cd infra
docker compose up
```

    **Note**: On first boot, Caldera takes 1–3 minutes to compile the sandcat.go agent. The caldera_agent container will print Waiting for Caldera... until the agent binary is available. This is expected behaviour.

3. Stop the stack

```bash
docker compose down
```