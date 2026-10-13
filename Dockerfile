# ─────────────────────────────────────────────
# Stage 1 — Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Build-time environment variables (passed via --build-arg)
ARG PUBLIC_URL=/
ARG REACT_APP_GITHUB_TOKEN

ENV PUBLIC_URL=$PUBLIC_URL \
    REACT_APP_GITHUB_TOKEN=$REACT_APP_GITHUB_TOKEN \
    NODE_ENV=production \
    CI=false

WORKDIR /app

# Install dependencies — separate layer for better cache reuse
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# ─────────────────────────────────────────────
# Stage 2 — Serve
# ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Run as a non-root user for least-privilege
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# nginx needs to write temp/lock files; grant ownership
RUN chown -R appuser:appgroup /usr/share/nginx/html \
    /var/cache/nginx \
    /var/log/nginx \
    /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
