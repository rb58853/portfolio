# Quickstart

Get the portfolio running locally in under five minutes using Docker.

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | v2 (included with Docker Desktop / Docker Engine 24+) |

---

## 1. Clone the repository

```bash
git clone https://github.com/rb58853/CV.git
cd CV
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your secrets:

| Variable | Purpose | Required |
|----------|---------|----------|
| `REACT_APP_GITHUB_TOKEN` | GitHub token for contribution graph | No |
| `GROQ_API_KEY` | Provider key for the AI chat assistant | No |
| `LLM_MODEL`, `LLM_FALLBACK_MODELS` | LiteLLM model ids for the assistant | No |
| `CHAT_BLOCKED_TERMS` | Names the assistant must never write (comma separated) | No |
| `ALLOWED_ORIGINS` | Browser origins allowed to open the chat (empty = any) | No |
| `PORT` | Host port (default `3000`) | No |
| `PUBLIC_URL` | Base URL path (default `/`) | No |

> **Note** — The app works without any tokens; those features will simply be disabled. Without a provider key the chat section shows the assistant as unavailable.

## 3. Build and run

```bash
docker compose up --build -d
```

The portfolio is now available at **http://localhost:3000**.

Compose starts two containers: `portfolio` (nginx serving the React build) and `portfolio-backend` (the AI assistant API). The backend is not published on the host; nginx proxies `/api/` to it, including the chat WebSocket at `/api/v1/chat`.

---

## Common commands

| Action | Command |
|--------|---------|
| Start (after first build) | `docker compose up -d` |
| Rebuild after source changes | `docker compose up --build -d` |
| View logs | `docker compose logs -f portfolio` |
| View assistant logs | `docker compose logs -f backend` |
| Stop | `docker compose down` |
| Remove image too | `docker compose down --rmi local` |

## Custom port

```bash
PORT=8080 docker compose up -d
```

## Serve from a sub-path

If you deploy behind a reverse proxy at e.g. `/portfolio`:

```bash
PUBLIC_URL=/portfolio docker compose up --build -d
```

---

## Health check

The container exposes a health endpoint at the root `/`. Docker polls it every 30 s on `127.0.0.1` (inside the container `localhost` resolves to IPv6, where nginx does not listen).

```bash
docker inspect --format='{{.State.Health.Status}}' portfolio
# healthy
```

## Production TLS (optional)

For HTTPS, place an nginx reverse proxy or a Traefik ingress in front of the container and terminate TLS there. The app container itself serves plain HTTP on port 80 internally.

The chat uses a WebSocket, so that proxy must forward the upgrade headers:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

---

## AI assistant

The assistant lives in `backend/` (FastAPI + LiteLLM). It answers only from the YAML files in `backend/knowledge/`: edit them to change what it knows. Each project `id` in `projects.yaml` must match a key in `src/environment/data/projects.js`, which is what lets the chat show project cards.

Run it locally without Docker:

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env        # set GROQ_API_KEY
.venv/bin/uvicorn app.main:app --port 8787 --reload --reload-dir app --reload-dir knowledge --reload-include '*.yaml'
```

`npm start` connects to `ws://localhost:8787` in development. Tests: `.venv/bin/pip install pytest && .venv/bin/python -m pytest`.
