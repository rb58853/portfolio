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
| `REACT_APP_CHAT_TOKEN` | Auth token for the AI chat assistant | No |
| `PORT` | Host port (default `3000`) | No |
| `PUBLIC_URL` | Base URL path (default `/`) | No |

> **Note** — The app works without any tokens; those features will simply be disabled.

## 3. Build and run

```bash
docker compose up --build -d
```

The portfolio is now available at **http://localhost:3000**.

---

## Common commands

| Action | Command |
|--------|---------|
| Start (after first build) | `docker compose up -d` |
| Rebuild after source changes | `docker compose up --build -d` |
| View logs | `docker compose logs -f portfolio` |
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

The container exposes a health endpoint at the root `/`. Docker polls it every 30 s.

```bash
docker inspect --format='{{.State.Health.Status}}' portfolio
# healthy
```

## Production TLS (optional)

For HTTPS, place an nginx reverse proxy or a Traefik ingress in front of the container and terminate TLS there. The app container itself serves plain HTTP on port 80 internally.
