# Deployment Guide: Docker & Kubernetes

## Table of Contents
1. [Docker Setup](#docker-setup)
2. [Kubernetes Setup](#kubernetes-setup)
3. [Workers & Job Queues](#workers--job-queues)
4. [Service Configuration](#service-configuration)
5. [Monitoring & Observability](#monitoring--observability)
6. [CI/CD Pipelines](#cicd-pipelines)

---

## Docker Setup

### Project Structure

```
project-root/
├── docker/
│   ├── dev/
│   │   ├── docker-compose.yml
│   │   ├── .env.example
│   │   └── postgres/
│   │       └── init.sql
│   ├── prod/
│   │   ├── docker-compose.yml
│   │   ├── .env.example
│   │   ├── nginx/
│   │   │   └── nginx.conf
│   │   └── caddy/
│   │       └── Caddyfile
│   └── workers/
│       ├── Dockerfile
│       └── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── drizzle.config.ts
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── next.config.ts
├── .env.example
└── package.json
```

### Backend Dockerfile

#### Development Dockerfile
```dockerfile
# docker/dev/backend/Dockerfile
FROM oven/bun:1.0 AS base

# Install dependencies
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN bun install

# Copy source code
COPY backend/tsconfig.json backend/tsconfig.json ./
COPY backend/drizzle.config.ts backend/drizzle.config.ts ./
COPY backend/src backend/src/

# Development mode
ENV NODE_ENV=development
ENV BUN_RUNTIME=development

# Expose port
EXPOSE 3000

# Run in watch mode
CMD ["bun", "run", "dev"]
```

#### Production Dockerfile (Multi-stage)
```dockerfile
# docker/prod/backend/Dockerfile
# Stage 1: Builder
FROM oven/bun:1.0 AS builder

WORKDIR /app

# Install dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY backend/tsconfig.json backend/tsconfig.json ./
COPY backend/drizzle.config.ts backend/drizzle.config.ts ./
COPY backend/src backend/src/

# Build TypeScript
RUN bun run build

# Stage 2: Production
FROM oven/bun:1.0 AS production

WORKDIR /app

# Install production dependencies only
COPY backend/package.json backend/package-lock.json* ./
RUN bun install --frozen-lockfile --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy migrations
COPY backend/db/migrations ./db/migrations
COPY backend/db/seed ./db/seed

# Environment variables
ENV NODE_ENV=production
ENV BUN_RUNTIME=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run health:check

# Production server
CMD ["bun", "run", "start:prod"]
```

### Frontend Dockerfile

#### Development Dockerfile
```dockerfile
# docker/dev/frontend/Dockerfile
FROM oven/bun:1.0 AS base

WORKDIR /app

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN bun install

# Copy source code
COPY frontend/tsconfig.json frontend/tsconfig.json ./
COPY frontend/next.config.ts frontend/next.config.ts ./
COPY frontend/src frontend/src/
COPY frontend/tailwind.config.ts frontend/tailwind.config.ts ./
COPY frontend/postcss.config.js frontend/postcss.config.js ./
COPY frontend/components.json frontend/components.json ./

# Development mode
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3001

# Run in dev mode with hot reload
CMD ["bun", "run", "dev"]
```

#### Production Dockerfile (Multi-stage)
```dockerfile
# docker/prod/frontend/Dockerfile
# Stage 1: Builder
FROM oven/bun:1.0 AS builder

WORKDIR /app

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY frontend/tsconfig.json frontend/tsconfig.json ./
COPY frontend/next.config.ts frontend/next.config.ts ./
COPY frontend/src frontend/src/
COPY frontend/tailwind.config.ts frontend/tailwind.config.ts ./
COPY frontend/postcss.config.js frontend/postcss.config.js ./
COPY frontend/components.json frontend/components.json ./

# Build Next.js application
RUN bun run build

# Stage 2: Production (Standalone)
FROM oven/bun:1.0 AS production

WORKDIR /app

# Install production dependencies only
COPY frontend/package.json frontend/package-lock.json* ./
RUN bun install --frozen-lockfile --production

# Copy public files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Production server
CMD ["bun", ".next/standalone/server.js"]
```

### Worker Dockerfile

```dockerfile
# docker/workers/Dockerfile
FROM oven/bun:1.0 AS base

WORKDIR /app

# Install dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN bun install

# Copy source code
COPY backend/tsconfig.json backend/tsconfig.json ./
COPY backend/drizzle.config.ts backend/drizzle.config.ts ./
COPY backend/src backend/src/
COPY backend/db backend/db/

# Worker environment
ENV NODE_ENV=production
ENV BUN_RUNTIME=production
ENV WORKER_TYPE=rss

# Expose health check port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run health:check:worker

# Start worker
CMD ["bun", "run", "worker:rss"]
```

### Development Docker Compose

```yaml
# docker/dev/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sonarr-dev-db
    environment:
      POSTGRES_USER: sonarr
      POSTGRES_PASSWORD: sonarr
      POSTGRES_DB: sonarr_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sonarr"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sonarr-dev-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../..
      dockerfile: docker/dev/backend/Dockerfile
    container_name: sonarr-dev-backend
    environment:
      DATABASE_URL: postgresql://sonarr:sonarr@postgres:5432/sonarr_dev
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      BUN_RUNTIME: development
      PORT: 3000
      API_KEY: development-api-key-change-in-production
      TVDB_API_KEY: ${TVDB_API_KEY}
      TMDB_API_KEY: ${TMDB_API_KEY}
      LOG_LEVEL: debug
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - ./media:/media:rw
      - ./config:/config:rw
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: ["bun", "run", "dev"]

  frontend:
    build:
      context: ../..
      dockerfile: docker/dev/frontend/Dockerfile
    container_name: sonarr-dev-frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000/api/v3
      NEXT_PUBLIC_WS_URL: ws://localhost:3000/ws
      NODE_ENV: development
      PORT: 3001
    ports:
      - "3001:3001"
    volumes:
      - ./frontend:/app
      - ./media:/media:ro
    depends_on:
      backend:
        condition: service_started
    command: ["bun", "run", "dev"]

  worker-rss:
    build:
      context: ../..
      dockerfile: docker/workers/Dockerfile
    container_name: sonarr-dev-worker-rss
    environment:
      DATABASE_URL: postgresql://sonarr:sonarr@postgres:5432/sonarr_dev
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      BUN_RUNTIME: development
      WORKER_TYPE: rss
      CONCURRENCY: 5
      TVDB_API_KEY: ${TVDB_API_KEY}
      TMDB_API_KEY: ${TMDB_API_KEY}
      LOG_LEVEL: debug
    volumes:
      - ./backend:/app
      - ./media:/media:rw
      - ./config:/config:rw
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: ["bun", "run", "worker:rss"]

  worker-import:
    build:
      context: ../..
      dockerfile: docker/workers/Dockerfile
    container_name: sonarr-dev-worker-import
    environment:
      DATABASE_URL: postgresql://sonarr:sonarr@postgres:5432/sonarr_dev
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      BUN_RUNTIME: development
      WORKER_TYPE: import
      CONCURRENCY: 3
      MEDIA_PATH: /media
      LOG_LEVEL: debug
    volumes:
      - ./backend:/app
      - ./media:/media:rw
      - ./config:/config:rw
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: ["bun", "run", "worker:import"]

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: sonarr-dev-redis-commander
    environment:
      - REDIS_HOSTS=redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
```

### Production Docker Compose

```yaml
# docker/prod/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sonarr-prod-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-sonarr}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-sonarr}
      POSTGRES_DB: ${DB_NAME:-sonarr}
      POSTGRES_INITDB_ARGS: "-E UTF8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-sonarr}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sonarr-network

  redis:
    image: redis:7-alpine
    container_name: sonarr-prod-redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --requirepass ${REDIS_PASSWORD:-redis}
      --save 900 1
      --save 300 10
      --save 60 10000
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sonarr-network

  backend:
    build:
      context: ../..
      dockerfile: docker/prod/backend/Dockerfile
    image: sonarr-backend:latest
    container_name: sonarr-prod-backend
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-sonarr}:${DB_PASSWORD:-sonarr}@postgres:5432/${DB_NAME:-sonarr}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis}@redis:6379
      NODE_ENV: production
      BUN_RUNTIME: production
      PORT: 3000
      API_KEY: ${API_KEY}
      TVDB_API_KEY: ${TVDB_API_KEY}
      TMDB_API_KEY: ${TMDB_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      SENTRY_DSN: ${SENTRY_DSN}
      LOGTAIL_SOURCE_TOKEN: ${LOGTAIL_SOURCE_TOKEN}
      LOG_LEVEL: info
      MEDIA_PATH: /media
      CONFIG_PATH: /config
      WORKER_CONCURRENCY: 5
    volumes:
      - ./media:/media:rw
      - ./config:/config:rw
      - ./backups:/backups:rw
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bun", "run", "health:check"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - sonarr-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  frontend:
    build:
      context: ../..
      dockerfile: docker/prod/frontend/Dockerfile
    image: sonarr-frontend:latest
    container_name: sonarr-prod-frontend
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: https://${DOMAIN:-sonarr.local}/api/v3
      NEXT_PUBLIC_WS_URL: wss://${DOMAIN:-sonarr.local}/ws
      NODE_ENV: production
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - sonarr-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  worker-rss:
    image: sonarr-backend:latest
    container_name: sonarr-prod-worker-rss
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-sonarr}:${DB_PASSWORD:-sonarr}@postgres:5432/${DB_NAME:-sonarr}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis}@redis:6379
      NODE_ENV: production
      BUN_RUNTIME: production
      WORKER_TYPE: rss
      CONCURRENCY: 5
      TVDB_API_KEY: ${TVDB_API_KEY}
      TMDB_API_KEY: ${TMDB_API_KEY}
      SENTRY_DSN: ${SENTRY_DSN}
      LOGTAIL_SOURCE_TOKEN: ${LOGTAIL_SOURCE_TOKEN}
      LOG_LEVEL: info
      MEDIA_PATH: /media
      CONFIG_PATH: /config
    volumes:
      - ./media:/media:rw
      - ./config:/config:rw
      - ./backups:/backups:rw
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bun", "run", "health:check:worker"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - sonarr-network
    command: ["bun", "run", "worker:rss"]
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  worker-import:
    image: sonarr-backend:latest
    container_name: sonarr-prod-worker-import
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-sonarr}:${DB_PASSWORD:-sonarr}@postgres:5432/${DB_NAME:-sonarr}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis}@redis:6379
      NODE_ENV: production
      BUN_RUNTIME: production
      WORKER_TYPE: import
      CONCURRENCY: 3
      MEDIA_PATH: /media
      CONFIG_PATH: /config
      SENTRY_DSN: ${SENTRY_DSN}
      LOGTAIL_SOURCE_TOKEN: ${LOGTAIL_SOURCE_TOKEN}
      LOG_LEVEL: info
    volumes:
      - ./media:/media:rw
      - ./config:/config:rw
      - ./backups:/backups:rw
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bun", "run", "health:check:worker"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - sonarr-network
    command: ["bun", "run", "worker:import"]
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  worker-decision:
    image: sonarr-backend:latest
    container_name: sonarr-prod-worker-decision
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-sonarr}:${DB_PASSWORD:-sonarr}@postgres:5432/${DB_NAME:-sonarr}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis}@redis:6379
      NODE_ENV: production
      BUN_RUNTIME: production
      WORKER_TYPE: decision
      CONCURRENCY: 10
      SENTRY_DSN: ${SENTRY_DSN}
      LOGTAIL_SOURCE_TOKEN: ${LOGTAIL_SOURCE_TOKEN}
      LOG_LEVEL: info
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bun", "run", "health:check:worker"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - sonarr-network
    command: ["bun", "run", "worker:decision"]
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.125'
          memory: 128M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  worker-organize:
    image: sonarr-backend:latest
    container_name: sonarr-prod-worker-organize
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-sonarr}:${DB_PASSWORD:-sonarr}@postgres:5432/${DB_NAME:-sonarr}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis}@redis:6379
      NODE_ENV: production
      BUN_RUNTIME: production
      WORKER_TYPE: organize
      CONCURRENCY: 3
      MEDIA_PATH: /media
      CONFIG_PATH: /config
      SENTRY_DSN: ${SENTRY_DSN}
      LOGTAIL_SOURCE_TOKEN: ${LOGTAIL_SOURCE_TOKEN}
      LOG_LEVEL: info
    volumes:
      - ./media:/media:rw
      - ./config:/config:rw
      - ./backups:/backups:rw
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bun", "run", "health:check:worker"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - sonarr-network
    command: ["bun", "run", "worker:organize"]
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.125'
          memory: 128M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  worker-notify:
    image: sonarr-backend:latest
    container_name: sonarr-prod-worker-notify
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-sonarr}:${DB_PASSWORD:-sonarr}@postgres:5432/${DB_NAME:-sonarr}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis}@redis:6379
      NODE_ENV: production
      BUN_RUNTIME: production
      WORKER_TYPE: notify
      CONCURRENCY: 5
      RESEND_API_KEY: ${RESEND_API_KEY}
      SENTRY_DSN: ${SENTRY_DSN}
      LOGTAIL_SOURCE_TOKEN: ${LOGTAIL_SOURCE_TOKEN}
      LOG_LEVEL: info
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bun", "run", "health:check:worker"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - sonarr-network
    command: ["bun", "run", "worker:notify"]
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.125'
          memory: 128M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  caddy:
    image: caddy:2-alpine
    container_name: sonarr-prod-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy/data:/data
      - ./caddy/config:/config
      - ./caddy/logs:/logs
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      ACME_AGREE: true
      EMAIL: ${EMAIL}
    depends_on:
      - backend
      - frontend
    networks:
      - sonarr-network

volumes:
  postgres_data:
  redis_data:

networks:
  sonarr-network:
    driver: bridge
```

---

## Kubernetes Setup

### Namespace and Resource Structure

```yaml
# k8s/00-namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: sonarr
  labels:
    name: sonarr
    app: sonarr

---
# k8s/01-configmap.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sonarr-config
  namespace: sonarr
data:
  NODE_ENV: "production"
  BUN_RUNTIME: "production"
  PORT: "3000"
  API_PREFIX: "/api/v3"
  WORKER_CONCURRENCY: "5"
  LOG_LEVEL: "info"
  MEDIA_PATH: "/media"
  CONFIG_PATH: "/config"
  BACKUPS_PATH: "/backups"
```

### Secrets Management

```yaml
# k8s/02-secrets.yml (Kubernetes Secrets)
apiVersion: v1
kind: Secret
metadata:
  name: sonarr-secrets
  namespace: sonarr
type: Opaque
stringData:
  DATABASE_URL: "postgresql://sonarr:CHANGE_ME@sonarr-postgres:5432/sonarr"
  REDIS_URL: "redis://:CHANGE_ME@sonarr-redis:6379"
  REDIS_PASSWORD: "CHANGE_ME"
  API_KEY: "CHANGE_ME"
  TVDB_API_KEY: "CHANGE_ME"
  TMDB_API_KEY: "CHANGE_ME"
  RESEND_API_KEY: "CHANGE_ME"
  SENTRY_DSN: "CHANGE_ME"
  LOGTAIL_SOURCE_TOKEN: "CHANGE_ME"
---
# Alternative: External Secrets (AWS Secrets Manager, Vault, etc.)
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: sonarr
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: sonarr-secrets-manager
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: sonarr-external-secrets
  namespace: sonarr
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: sonarr-secrets
    creationPolicy: Owner
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: sonarr/DATABASE_URL
  - secretKey: REDIS_URL
    remoteRef:
      key: sonarr/REDIS_URL
  - secretKey: API_KEY
    remoteRef:
      key: sonarr/API_KEY
```

### PostgreSQL StatefulSet

```yaml
# k8s/10-postgres.yml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sonarr-postgres-pvc
  namespace: sonarr
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: sonarr-postgres
  namespace: sonarr
spec:
  serviceName: sonarr-postgres
  replicas: 1
  selector:
    matchLabels:
      app: sonarr-postgres
  template:
    metadata:
      labels:
        app: sonarr-postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
          - name: POSTGRES_USER
            value: sonarr
          - name: POSTGRES_PASSWORD
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: DATABASE_PASSWORD
          - name: POSTGRES_DB
            value: sonarr
          - name: PGDATA
            value: /var/lib/postgresql/data/pgdata
        ports:
          - containerPort: 5432
        volumeMounts:
          - name: postgres-data
            mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command:
              - pg_isready
              - -U
              - sonarr
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
              - pg_isready
              - -U
              - sonarr
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 2
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 20Gi
```

### Redis Deployment

```yaml
# k8s/11-redis.yml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sonarr-redis-pvc
  namespace: sonarr
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-redis
  namespace: sonarr
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sonarr-redis
  template:
    metadata:
      labels:
        app: sonarr-redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
          - redis-server
          - --appendonly
          - --requirepass
          - $(REDIS_PASSWORD)
        env:
          - name: REDIS_PASSWORD
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: REDIS_PASSWORD
        ports:
          - containerPort: 6379
        volumeMounts:
          - name: redis-data
            mountPath: /data
        livenessProbe:
          exec:
            command:
              - redis-cli
              - -a
              - $(REDIS_PASSWORD)
              - ping
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
              - redis-cli
              - -a
              - $(REDIS_PASSWORD)
              - ping
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 2
        resources:
          requests:
            memory: "128Mi"
            cpu: "50m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: sonarr-redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: sonarr-redis
  namespace: sonarr
spec:
  selector:
    app: sonarr-redis
  ports:
    - port: 6379
      targetPort: 6379
```

### Backend Deployment

```yaml
# k8s/20-backend-deployment.yml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sonarr-backend
  namespace: sonarr
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sonarr-media-pvc
  namespace: sonarr
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: standard
  resources:
    requests:
      storage: 500Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sonarr-config-pvc
  namespace: sonarr
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: standard
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-backend
  namespace: sonarr
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sonarr-backend
  template:
    metadata:
      labels:
        app: sonarr-backend
    spec:
      serviceAccountName: sonarr-backend
      containers:
      - name: backend
        image: sonarr-backend:latest
        imagePullPolicy: Always
        env:
          - name: NODE_ENV
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: NODE_ENV
          - name: BUN_RUNTIME
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: BUN_RUNTIME
          - name: PORT
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: PORT
          - name: DATABASE_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: DATABASE_URL
          - name: REDIS_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: REDIS_URL
          - name: API_KEY
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: API_KEY
          - name: TVDB_API_KEY
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: TVDB_API_KEY
          - name: TMDB_API_KEY
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: TMDB_API_KEY
          - name: RESEND_API_KEY
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: RESEND_API_KEY
          - name: SENTRY_DSN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: SENTRY_DSN
            optional: true
          - name: LOGTAIL_SOURCE_TOKEN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: LOGTAIL_SOURCE_TOKEN
            optional: true
          - name: LOG_LEVEL
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: LOG_LEVEL
          - name: MEDIA_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: MEDIA_PATH
          - name: CONFIG_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: CONFIG_PATH
          - name: BACKUPS_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: BACKUPS_PATH
        ports:
          - containerPort: 3000
            name: http
          - containerPort: 3002
            name: ws
        volumeMounts:
          - name: media
            mountPath: /media
          - name: config
            mountPath: /config
          - name: tmp
            mountPath: /tmp
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 30
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
        - name: media
          persistentVolumeClaim:
            claimName: sonarr-media-pvc
        - name: config
          persistentVolumeClaim:
            claimName: sonarr-config-pvc
        - name: tmp
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: sonarr-backend
  namespace: sonarr
spec:
  selector:
    app: sonarr-backend
  ports:
    - port: 3000
      targetPort: 3000
      name: http
    - port: 3002
      targetPort: 3002
      name: ws
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sonarr-backend-hpa
  namespace: sonarr
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sonarr-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
        - type: Percent
          value: 50
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
        - type: Percent
          value: 100
```

### Frontend Deployment

```yaml
# k8s/30-frontend-deployment.yml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sonarr-frontend-cache-pvc
  namespace: sonarr
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: standard
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-frontend
  namespace: sonarr
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sonarr-frontend
  template:
    metadata:
      labels:
        app: sonarr-frontend
      annotations:
        kubernetes.io/change-cause: "Triggered by deployment"
    spec:
      containers:
      - name: frontend
        image: sonarr-frontend:latest
        imagePullPolicy: Always
        env:
          - name: NODE_ENV
            value: "production"
          - name: NEXT_TELEMETRY_DISABLED
            value: "1"
          - name: PORT
            value: "3001"
          - name: NEXT_PUBLIC_API_URL
            value: "https://sonarr.example.com/api/v3"
          - name: NEXT_PUBLIC_WS_URL
            value: "wss://sonarr.example.com/ws"
          - name: NEXT_PUBLIC_SENTRY_DSN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: SENTRY_DSN
            optional: true
        ports:
          - containerPort: 3001
            name: http
        volumeMounts:
          - name: cache
            mountPath: /.next/cache
          - name: tmp
            mountPath: /tmp
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 30
        resources:
          requests:
            memory: "256Mi"
            cpu: "125m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
        - name: cache
          persistentVolumeClaim:
            claimName: sonarr-frontend-cache-pvc
        - name: tmp
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: sonarr-frontend
  namespace: sonarr
spec:
  selector:
    app: sonarr-frontend
  ports:
    - port: 3001
      targetPort: 3001
      name: http
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sonarr-frontend-hpa
  namespace: sonarr
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sonarr-frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Worker Deployments

#### RSS Worker

```yaml
# k8s/40-worker-rss.yml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sonarr-worker-rss
  namespace: sonarr
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-worker-rss
  namespace: sonarr
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sonarr-worker-rss
  template:
    metadata:
      labels:
        app: sonarr-worker-rss
    spec:
      serviceAccountName: sonarr-worker-rss
      containers:
      - name: worker-rss
        image: sonarr-backend:latest
        imagePullPolicy: Always
        env:
          - name: NODE_ENV
            value: "production"
          - name: BUN_RUNTIME
            value: "production"
          - name: WORKER_TYPE
            value: "rss"
          - name: CONCURRENCY
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: WORKER_CONCURRENCY
          - name: DATABASE_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: DATABASE_URL
          - name: REDIS_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: REDIS_URL
          - name: TVDB_API_KEY
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: TVDB_API_KEY
          - name: TMDB_API_KEY
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: TMDB_API_KEY
          - name: SENTRY_DSN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: SENTRY_DSN
            optional: true
          - name: LOGTAIL_SOURCE_TOKEN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: LOGTAIL_SOURCE_TOKEN
            optional: true
          - name: LOG_LEVEL
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: LOG_LEVEL
          - name: MEDIA_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: MEDIA_PATH
          - name: CONFIG_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: CONFIG_PATH
          - name: BACKUPS_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: BACKUPS_PATH
        command: ["bun", "run", "worker:rss"]
        volumeMounts:
          - name: media
            mountPath: /media
          - name: config
            mountPath: /config
          - name: tmp
            mountPath: /tmp
        livenessProbe:
          httpGet:
            path: /health/worker
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
        - name: media
          persistentVolumeClaim:
            claimName: sonarr-media-pvc
        - name: config
          persistentVolumeClaim:
            claimName: sonarr-config-pvc
        - name: tmp
          emptyDir: {}
```

#### Import Worker

```yaml
# k8s/41-worker-import.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-worker-import
  namespace: sonarr
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sonarr-worker-import
  template:
    metadata:
      labels:
        app: sonarr-worker-import
    spec:
      containers:
      - name: worker-import
        image: sonarr-backend:latest
        imagePullPolicy: Always
        env:
          - name: WORKER_TYPE
            value: "import"
          - name: CONCURRENCY
            value: "3"
          - name: DATABASE_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: DATABASE_URL
          - name: REDIS_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: REDIS_URL
          - name: MEDIA_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: MEDIA_PATH
          - name: CONFIG_PATH
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: CONFIG_PATH
          - name: SENTRY_DSN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: SENTRY_DSN
            optional: true
          - name: LOGTAIL_SOURCE_TOKEN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: LOGTAIL_SOURCE_TOKEN
            optional: true
          - name: LOG_LEVEL
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: LOG_LEVEL
        command: ["bun", "run", "worker:import"]
        volumeMounts:
          - name: media
            mountPath: /media
          - name: config
            mountPath: /config
          - name: tmp
            mountPath: /tmp
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
        - name: media
          persistentVolumeClaim:
            claimName: sonarr-media-pvc
        - name: config
          persistentVolumeClaim:
            claimName: sonarr-config-pvc
        - name: tmp
          emptyDir: {}
```

#### Notification Worker

```yaml
# k8s/44-worker-notify.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-worker-notify
  namespace: sonarr
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sonarr-worker-notify
  template:
    metadata:
      labels:
        app: sonarr-worker-notify
    spec:
      containers:
      - name: worker-notify
        image: sonarr-backend:latest
        imagePullPolicy: Always
        env:
          - name: WORKER_TYPE
            value: "notify"
          - name: CONCURRENCY
            value: "5"
          - name: DATABASE_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: DATABASE_URL
          - name: REDIS_URL
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: REDIS_URL
          - name: RESEND_API_KEY
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: RESEND_API_KEY
          - name: SENTRY_DSN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: SENTRY_DSN
            optional: true
          - name: LOGTAIL_SOURCE_TOKEN
            valueFrom:
              secretKeyRef:
                name: sonarr-secrets
                key: LOGTAIL_SOURCE_TOKEN
            optional: true
          - name: LOG_LEVEL
            valueFrom:
              configMapKeyRef:
                name: sonarr-config
                key: LOG_LEVEL
        command: ["bun", "run", "worker:notify"]
        resources:
          requests:
            memory: "256Mi"
            cpu: "125m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Ingress Configuration

```yaml
# k8s/50-ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sonarr-ingress
  namespace: sonarr
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "442"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-buffer-size: "50m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/client-body-buffer-size: "50m"
    nginx.ingress.kubernetes.io/proxy-request-buffering: "on"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - sonarr.example.com
      secretName: sonarr-tls
  rules:
    - host: sonarr.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sonarr-frontend
                port:
                  number: 3001
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: sonarr-backend
                port:
                  number: 3000
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: sonarr-backend
                port:
                  number: 3002
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sonarr-backend-ingress
  namespace: sonarr
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "442"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Api-Key"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.sonarr.example.com
      secretName: sonarr-api-tls
  rules:
    - host: api.sonarr.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sonarr-backend
                port:
                  number: 3000
```

---

## Workers & Job Queues

### BullMQ Worker Architecture

#### Worker Types and Responsibilities

```typescript
// backend/workers/types/worker.types.ts
export enum WorkerType {
  RSS = 'rss',
  IMPORT = 'import',
  DECISION = 'decision',
  ORGANIZE = 'organize',
  NOTIFY = 'notify',
  REFRESH = 'refresh',
  BACKUP = 'backup',
  CLEANUP = 'cleanup',
}

export interface WorkerConfig {
  type: WorkerType;
  concurrency: number;
  retryAttempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete: number;
  removeOnFail: number;
}

export const WORKER_CONFIGS: Record<WorkerType, WorkerConfig> = {
  [WorkerType.RSS]: {
    type: WorkerType.RSS,
    concurrency: 5,
    retryAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
  [WorkerType.IMPORT]: {
    type: WorkerType.IMPORT,
    concurrency: 3,
    retryAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
  [WorkerType.DECISION]: {
    type: WorkerType.DECISION,
    concurrency: 10,
    retryAttempts: 1,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
  [WorkerType.ORGANIZE]: {
    type: WorkerType.ORGANIZE,
    concurrency: 3,
    retryAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 15000,
    },
    removeOnComplete: 50,
    removeOnFail: 250,
  },
  [WorkerType.NOTIFY]: {
    type: WorkerType.NOTIFY,
    concurrency: 5,
    retryAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
  [WorkerType.REFRESH]: {
    type: WorkerType.REFRESH,
    concurrency: 2,
    retryAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
  [WorkerType.BACKUP]: {
    type: WorkerType.BACKUP,
    concurrency: 1,
    retryAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
    removeOnComplete: 10,
    removeOnFail: 10,
  },
  [WorkerType.CLEANUP]: {
    type: WorkerType.CLEANUP,
    concurrency: 1,
    retryAttempts: 1,
    backoff: {
      type: 'fixed',
      delay: 300000,
    },
    removeOnComplete: 10,
    removeOnFail: 10,
  },
};
```

#### Queue Connection Setup

```typescript
// backend/queues/index.ts
import { Queue, Worker, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Redis connection
const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
});

// Queue default options
const defaultQueueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
};

// Create queues
export const rssQueue = new Queue('rss', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const importQueue = new Queue('import', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const decisionQueue = new Queue('decision', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export const organizeQueue = new Queue('organize', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    export: 50,
    removeOnFail: 250,
  },
});

export const notifyQueue = new Queue('notify', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    removeOnComplete: 500,
    removeOnFail: 500,
  },
});

export const refreshQueue = new Queue('refresh', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueue.defaultJobOptions,
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

export const backupQueue = new Queue('backup', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    removeOnComplete: 10,
    removeOnFail: 10,
  },
});

export const cleanupQueue = new Queue('cleanup', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    removeOnComplete: 10,
    removeOnFail: 10,
  },
});

// Wait for all queues to be ready
async function closeQueues() {
  await Promise.all([
    rssQueue.close(),
    importQueue.close(),
    decisionQueue.close(),
    organizeQueue.close(),
    notifyQueue.close(),
    refreshQueue.close(),
    backupQueue.close(),
    cleanupQueue.close(),
  ]);
  redis.disconnect();
}

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing queues...');
  await closeQueues();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing queues...');
  await closeQueues();
  process.exit(0);
});
```

#### RSS Worker

```typescript
// backend/workers/rss.worker.ts
import { Worker, Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { rssQueue } from '@/queues';
import { rssService } from '@/core/indexer/services/rss.service';
import { releaseParserService } from '@/core/parser/services/release-parser.service';

interface RSSJobData {
  indexerId: number;
  indexerName: string;
  indexerType: string;
}

async function rssProcessor(job: Job<RSSJobData>) {
  const { indexerId, indexerName, indexerType } = job.data;
  logger.info({ indexerId, jobId: job.id }, 'Starting RSS job');

  try {
    // Fetch RSS feed
    const feed = await rssService.fetchFeed(indexerId, indexerType);

    // Parse releases
    const releases = releaseParserService.parseFeed(feed, indexerType);

    // Process releases (send to decision queue)
    for (const release of releases) {
      await decisionQueue.add('process-release', {
        release,
        indexerId,
        indexerName,
        indexerType,
      });
    }

    // Update indexer status
    await rssService.updateLastSync(indexerId, new Date());

    logger.info(
      { indexerId, jobId: job.id, releasesCount: releases.length },
      'RSS job completed',
    );
  } catch (error) {
    logger.error(
      { indexerId, jobId: job.id, error },
      'RSS job failed',
    );
    throw error;
  }
}

// Create worker
const config = WORKER_CONFIGS[WorkerType.RSS];
export const rssWorker = new Worker<RSSJobData>(
  'rss',
  rssProcessor,
  {
    connection: rssQueue.opts.connection,
    concurrency: config.concurrency,
    autorun: false,
  },
);

// Handle worker events
rssWorker.on('completed', (job) => {
  logger.debug(
    { jobId: job.id, indexerId: job.data.indexerId },
    'RSS job completed',
  );
});

rssWorker.on('failed', (job, error) => {
  logger.error(
    { jobId: job.id, indexerId: job.data.indexerId, error },
    'RSS job failed',
  );
});

rssWorker.on('error', (error) => {
  logger.error('Worker error', { error });
});

rssWorker.on('stalled', (job) => {
  logger.warn('Job stalled', { jobId: job.id });
});

// Start worker
async function startRSSWorker() {
  logger.info('Starting RSS worker...');
  await rssWorker.run();
  logger.info('RSS worker started');
}

export { startRSSWorker };
```

#### Decision Worker

```typescript
// backend/workers/decision.worker.ts
import { Worker, Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { decisionQueue } from '@/queues';
import { decisionService } from '@/core/decision-engine/services/decision.service';

interface DecisionJobData {
  release: ParsedRelease;
  indexerId: number;
  indexerName: string;
  indexerType: string;
}

async function decisionProcessor(job: Job<DecisionJobData>) {
  const { release, indexerId, indexerName, indexerType } = job.data;
  logger.info(
    { releaseTitle: release.title, jobId: job.id },
    'Starting decision job',
  );

  try {
    // Make decision (score release)
    const decision = await decisionService.makeDecision({
      release,
      indexerId,
      indexerName,
      indexerType,
    });

    if (decision.approved) {
      // Check if episode is wanted
      const wanted = await decisionService.checkWanted({
        seriesId: decision.seriesId,
        episodeId: decision.episodeId,
        seasonNumber: decision.seasonNumber,
        episodeNumber: decision.episodeNumber,
      });

      if (wanted) {
        // Add to queue
        await importQueue.add('download', {
          release,
          decision,
          indexerId,
          indexerName,
          indexerType,
        });

        logger.info(
          { releaseTitle: release.title, jobId: job.id },
          'Release approved and queued for download',
        );
      } else {
        logger.info(
          { releaseTitle: release.title, jobId: job.id, reason: decision.rejections?.[0]?.reason },
          'Release not wanted',
        );
      }
    } else {
      logger.info(
        { releaseTitle: release.title, jobId: job.id, reason: decision.rejections?.[0]?.reason },
        'Release rejected',
      );
    }

    logger.info(
      { releaseTitle: release.title, jobId: job.id, approved: decision.approved },
      'Decision job completed',
    );
  } catch (error) {
    logger.error(
      { releaseTitle: release.title, jobId: job.id, error },
      'Decision job failed',
    );
    throw error;
  }
}

// Create worker
const config = WORKER_CONFIGS[WorkerType.DECISION];
export const decisionWorker = new Worker<DecisionJobData>(
  'decision',
  decisionProcessor,
  {
    connection: decisionQueue.opts.connection,
    concurrency: config.concurrency,
    autorun: false,
  },
);

// Start worker
async function startDecisionWorker() {
  logger.info('Starting decision worker...');
  await decisionWorker.run();
  logger.info('Decision worker started');
}

export { startDecisionWorker };
```

#### Import Worker

```typescript
// backend/workers/import.worker.ts
import { Worker, Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { importQueue } from '@/queues';
import { importService } from '@/core/media-files/services/import.service';
import { downloadService } from '@/core/download/services/download-client.service';
import { queueService } from '@/core/download/services/queue.service';

interface ImportJobData {
  release: ParsedRelease;
  decision: Decision;
  indexerId: number;
  indexerName: string;
  indexerType: string;
}

async function importProcessor(job: Job<ImportJobData>) {
  const { release, decision, indexerId, indexerName, indexerType } = job.data;
  logger.info(
    { releaseTitle: release.title, jobId: job.id },
    'Starting import job',
  );

  try {
    // Download release
    const downloadId = await downloadService.download({
      release,
      indexerId,
      indexerName,
      indexerType,
    });

    logger.info(
      { releaseTitle: release.title, downloadId, jobId: job.id },
      'Download started',
    );

    // Update queue status
    await queueService.updateStatus(downloadId, {
      status: 'downloading',
      size: release.size,
      title: release.title,
      quality: decision.quality,
      customFormats: decision.customFormats,
    });

    // Wait for download to complete
    await downloadService.waitForComplete(downloadId);

    // Update queue status
    await queueService.updateStatus(downloadId, {
      status: 'importing',
    });

    // Import download
    const imported = await importService.import({
      downloadId,
      release,
      decision,
    });

    if (imported) {
      // Remove from queue
      await queueService.remove(downloadId);

      logger.info(
        { releaseTitle: release.title, downloadedPath: imported.path, jobId: job.id },
        'Import job completed',
      );
    } else {
      // Mark as failed
      await queueService.updateStatus(downloadId, {
        status: 'failed',
        errorMessage: 'Import failed',
      });

      logger.error(
        { releaseTitle: release.title, jobId: job.id },
        'Import job failed',
      );
    }
  } catch (error) {
    logger.error(
      { releaseTitle: release.title, jobId: job.id, error },
      'Import job failed',
    );
    throw error;
  }
}

// Create worker
const config = WORKER_CONFIGS[WorkerType.IMPORT];
export const importWorker = new Worker<ImportJobData>(
  'import',
  importProcessor,
  {
    connection: importQueue.opts.connection,
    concurrency: config.concurrency,
    autorun: false,
  },
);

// Start worker
async function startImportWorker() {
  logger.info('Starting import worker...');
  await importWorker.run();
  logger.info('Import worker started');
}

export { startImportWorker };
```

#### Worker Scheduler

```typescript
// backend/jobs/scheduler.ts
import { QueueScheduler } from 'bullmq';
import { logger } from '@/lib/logger';
import { rssQueue } from '@/queues';
import { refreshQueue } from '@/backupQueue } from '@/queues';
import { backupQueue } from '@/queues';
import { cleanupQueue } from '@/queues';

async function startScheduler() {
  logger.info('Starting job scheduler...');

  // RSS feed scheduling - run every 15 minutes
  const rssScheduler = new QueueScheduler('rss', {
    connection: rssQueue.opts.connection,
    interval: 15 * 60 * 1000, // 15 minutes
    name: 'rss-scheduler',
  });

  // Add indexer jobs
  const indexers = await indexerService.getAll();
  for (const indexer of indexers) {
    if (indexer.enabled) {
      await rssScheduler.add(
        `rss-${indexer.id}`,
        {
          indexerId: indexer.id,
          indexerName: indexer.name,
          indexerType: indexer.type,
        },
        {
          repeat: {
            every: indexer.rssInterval || 15 * 60 * 1000,
          immediately: true,
          tz: process.env.TZ || 'UTC',
          startDate: new Date(),
        },
        },
      );
    }
  }

  // Metadata refresh scheduling - run every hour
  const refreshScheduler = new QueueScheduler('refresh', {
    connection: refreshQueue.opts.connection,
    interval: 60 * 60 * 1000, // 1 hour
    name: 'refresh-scheduler',
  });

  await refreshScheduler.add(
    'refresh-series',
    { type: 'series' },
    {
      repeat: {
        every: 60 * 60 * 1000,
        immediately: true,
      },
    },
  );

  await refreshScheduler.add(
    'refresh-episodes',
    { type: 'episodes' },
    {
      repeat: {
        every: 30 * 60 * 1000, // 30 minutes
        immediately: true,
      },
    },
  );

  // Backup scheduling - run daily at 2 AM
  const backupScheduler = new QueueScheduler('backup', {
    connection: backupQueue.opts.connection,
    interval: 24 * 60 * 60 * 1000, // 24 hours
    name: 'backup-scheduler',
  });

  await backupScheduler.add(
    'backup-database',
    { type: 'database' },
    {
      repeat: {
        pattern: '0 2 * * *', // 2 AM daily
        tz: process.env.TZ || 'UTC',
      },
    },
  );

  await backupScheduler.add(
    'backup-config',
    { type: 'config' },
    {
      repeat: {
        pattern: '0 2 * * *', // 2 AM daily
        tz: process.env.TZ || 'UTC',
      },
    },
  );

  // Cleanup scheduling - run every 6 hours
  const cleanupScheduler = new QueueScheduler('cleanup', {
    connection: cleanupQueue.opts.connection,
    interval: 6 * 60 * 60 * 1000, // 6 hours
    name: 'cleanup-scheduler',
  });

  await cleanupScheduler.add(
    'cleanup-history',
    { type: 'history', days: 30 },
    {
      repeat: {
        every: 6 * 60 * 60 * 1000,
        immediately: false,
      },
    },
  );

  await cleanupScheduler.add(
    'cleanup-queue',
    { type: 'queue', hours: 24 },
    {
      repeat: {
        every: 6 * 60 * 60 * 1000,
        immediately: false,
      },
    },
  );

  await cleanupScheduler.add(
    'cleanup-blocklist',
    { type: 'blocklist', days: 90 },
    {
      repeat: {
        every: 6 * 60 * 60 * 1000,
        immediately: false,
      },
    },
  );

  // Start schedulers
  await rssScheduler.run();
  await refreshScheduler.run();
  await backupScheduler.run();
  await cleanupScheduler.run();

  logger.info('Job scheduler started');
}

export { startScheduler };
```

#### Worker Entry Point

```typescript
// backend/workers/index.ts
import { logger } from '@/lib/logger';
import { WORKER_TYPE } from './types/worker.types';

const workerType = process.env.WORKER_TYPE as WORKER_TYPE;

async function startWorker() {
  logger.info({ workerType }, 'Starting worker...');

  switch (workerType) {
    case WORKER_TYPE.RSS:
      const { startRSSWorker } = await import('./rss.worker');
      await startRSSWorker();
      break;
    case WORKER_TYPE.IMPORT:
      const { startImportWorker } = await import('./import.worker');
      await startImportWorker();
      break;
    case WORKER_TYPE.DECISION:
      const { startDecisionWorker } = await import('./decision.worker');
      await startDecisionWorker();
      break;
    case WORKER_TYPE.ORGANIZE:
      const { startOrganizeWorker } = await import('./organize.worker');
      await startOrganizeWorker();
      break;
    case WORKER_TYPE.NOTIFY:
      const { startNotifyWorker } = await import('./notify.worker');
      await startNotifyWorker();
      break;
    case WORKER_TYPE.REFRESH:
      const { startRefreshWorker } = await import('./refresh.worker');
      await startRefreshWorker();
      break;
    case WORKER_TYPE.BACKUP:
      const { startBackupWorker } = await import('./backup.worker');
      await startBackupWorker();
      break;
    case WORKER_TYPE.CLEANUP:
      const { startCleanupWorker } = await import('./cleanup.worker');
      await startCleanupWorker();
      break;
    default:
      throw new Error(`Unknown worker type: ${workerType}`);
  }
}

startWorker().catch((error) => {
  logger.error({ error }, 'Failed to start worker');
  process.exit(1);
});
```

### Package.json Scripts

```json
{
  "name": "sonarr",
  "version": "1.0.0",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "dev:backend": "bun run --watch backend/src/index.ts",
    "dev:frontend": "cd frontend && bun run dev",
    "build": "bun run build:backend && bun run build:frontend",
    "build:backend": "bun build backend/src/index.ts --outdir backend/dist",
    "build:frontend": "cd frontend && bun run build",
    "build:prod": "bun run build:backend && bun run build:frontend:prod",
    "start": "bun run backend/dist/index.js",
    "start:prod": "bun run backend/dist/index.js",
    "worker:rss": "WORKER_TYPE=rss bun run backend/workers/index.ts",
    "worker:import": "WORKER_TYPE=import bun run backend/workers/index.ts",
    "worker:decision": "WORKER_TYPE=decision bun run backend/workers/index.ts",
    "worker:organize": "WORKER_TYPE=organize bun run backend/workers/index.ts",
    "worker:notify": "WORKER_TYPE=notify bun run backend/workers/index.ts",
    "worker:refresh": "WORKER_TYPE=refresh bun run backend/workers/index.ts",
    "worker:backup": "WORKER_TYPE=backup bun run backend/workers/index.ts",
    "worker:cleanup": "WORKER_TYPE=cleanup bun run backend/workers/index.ts",
    "start:scheduler": "bun run backend/jobs/scheduler.ts",
    "health:check": "bun run backend/health/health-check.ts",
    "health:check:worker": "bun run backend/health/worker-health-check.ts",
    "db:generate": "bun run drizzle-kit generate",
    "db:push": "bun run drizzle-kit push:pg",
    "db:migrate:create": "bunx drizzle-kit generate",
    "db:migrate:push": "bunx drizzle-kit push:pg",
    "db:migrate:rollback": "bunx drizzle-kit rollback",
    "db:reset": "bunx drizzle-kit push:pg --force",
    "db:seed": "bun run backend/db/seed/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:integration": "bun test backend/integration/*.test.ts",
    "test:e2e": "bun test frontend/e2e/*.test.ts",
    "typecheck": "bun run tsc --noEmit",
    "lint": "bun run eslint . --fix",
    "lint:backend": "bun run eslint backend --fix",
    "lint:frontend": "cd frontend && bun run eslint . --fix",
    "format": "bun run prettier --write .",
    "format:check": "bun run prettier --check .",
    "docker:dev:up": "docker-compose -f docker/dev/docker-compose.yml up -d",
    "docker:dev:down": "docker-compose -f docker/dev/docker-compose.yml down",
    "docker:dev:logs": "docker-compose -f docker/dev/docker-compose.yml logs -f",
    "docker:dev:restart": "docker-compose -f docker/dev/docker-compose.yml restart",
    "docker:prod:build": "docker-compose -f docker/prod/docker-compose.yml build",
    "docker:prod:up": "docker-compose -f docker/prod/docker-compose.yml up -d",
    "docker:prod:down": "docker-compose -f docker/prod/docker-compose.yml down",
    "docker:prod:logs": "docker-compose -f docker/prod/docker-compose.yml logs -f",
    "docker:prod:restart": "docker-compose -f docker/prod/docker-compose.yml restart",
    "k8s:apply": "kubectl apply -f k8s/",
    "k8s:delete": "kubectl delete -f k8s/",
    "k8s:logs": "kubectl logs -f deployment/sonarr-backend -n sonarr",
    "k8s:scale:backend": "kubectl scale deployment/sonarr-backend --replicas=3 -n sonarr",
    "k8s:scale:frontend": "kubectl scale deployment/sonarr-frontend --replicas=3 -n sonarr"
  }
}
```

---

## Service Configuration

### Environment Variables

```bash
# .env.example
# Database
DATABASE_URL=postgresql://sonarr:sonarr@localhost:5432/sonarr
DB_USER=sonarr
DB_PASSWORD=sonarr

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Application
NODE_ENV=production
BUN_RUNTIME=production
PORT=3000
API_KEY=your-api-key-here

# Media
MEDIA_PATH=/media
CONFIG_PATH=/config
BACKUPS_PATH=/backups

# API Keys
TVDB_API_KEY=your-tvdb-api-key-here
TMDB_API_KEY=your-tmdb-api-key-here

# Email
RESEND_API_KEY=your-resend-api-key-here
EMAIL_FROM=noreply@sonarr.example.com

# Monitoring
SENTRY_DSN=your-sentry-dsn-here
LOGTAIL_SOURCE_TOKEN=your-logtail-token-here

# Workers
WORKER_CONCURRENCY=5

# Logging
LOG_LEVEL=info
TZ=UTC
```

### Health Checks

```typescript
// backend/health/health-check.ts
import { Hono } from 'hono';
import { db } from '@/db/client';
import { redis } from '@/cache/client';
import { logger } from '@/lib/logger';

const app = new Hono();

app.get('/health', (c) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {} as Record<string, any>,
  };

  // Check database
  try {
    await db.select({ count: sql`1` }).from(series);
    checks.checks.database = {
      status: 'ok',
      latency: Date.now() - Date.now(),
    };
  } catch (error) {
    checks.checks.database = {
      status: 'error',
      error: (error as Error).message,
    };
  }

  // Check Redis
  try {
    const result = await redis.ping();
    checks.checks.redis = {
      status: 'ok',
      latency: Date.now() - Date.now(),
    };
  } catch (error) {
    checks.checks.redis = {
      status: 'error',
      error: (error as Error).message,
    };
  }

  // Check BullMQ queues
  try {
    const rssJobCounts = await rssQueue.getJobCounts();
    checks.checks.queues = {
      rss: {
        waiting: rssJobCounts.waiting,
        active: rssJobCounts.active,
        completed: rssJobCounts.completed,
        failed: rssJobCounts.failed,
        delayed: rssJobCounts.delayed,
      },
    };
  } catch (error) {
    checks.checks.queues = {
      status: 'error',
      error: (error as Error).message,
    };
  }

  // Determine overall status
  const hasErrors = Object.values(checks.checks).some(
    (check) => check.status === 'error',
  );

  return c.json(
    hasErrors ? { ...checks, status: 'degraded' } : checks,
    hasErrors ? 503 : 200,
  );
});

export default app;
```

---

## Monitoring & Observability

### Prometheus Metrics

```typescript
// backend/metrics/prometheus.ts
import { Counter, Histogram, Registry, register } from 'prom-client';

const register = new Registry();

// HTTP request counter
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Worker metrics
const workerJobsProcessed = new Counter({
  name: 'worker_jobs_processed_total',
  help: 'Total number of worker jobs processed',
  labelNames: ['worker_type', 'status'],
  registers: [register],
});

const workerJobDuration = new Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Duration of worker jobs in seconds',
  name: ['worker_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

// Database metrics
const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['table', 'operation'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [register],
});

// Queue metrics
const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Current queue size',
  labelNames: ['queue_name'],
  registers: [register],
});

// Cache metrics
const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  registers: [register],
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  registers: [register],
});

export { register, httpRequestDuration, httpRequestsTotal, workerJobsProcessed, workerJobDuration, dbQueryDuration, queueSize, cacheHits, cacheMisses };
```

### Metrics Middleware (Hono)

```typescript
// backend/middleware/prometheus.middleware.ts
import { middleware } from 'hono/factory';
import { httpRequestDuration, httpRequestsTotal } from '@/metrics/prometheus';

export const prometheusMiddleware = middleware(async (c, next) => {
  const start = Date.now();

  await next();

  const duration = (Date.now() - start) / 1000;
  const method = c.req.method;
  const route = c.req.routePath || c.req.path;
  const statusCode = c.res.status;

  httpRequestDuration
    .labels(method, route, statusCode)
    .observe(duration);
  httpRequestsTotal
    .labels(method, route, statusCode)
    .inc();

  return c.res;
});
```

### Metrics Endpoint

```typescript
// backend/app/routes/metrics.route.ts
import { Hono } from 'hono';
import { register } from '@/metrics/prometheus';

const app = new Hono();

app.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.body(metrics);
});

export default app;
```

---

## CI/CD Pipelines

### GitHub Actions - Build and Push Images

```yaml
# .github/workflows/build.yml
name: Build and Push Images

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            sonarr-backend
            sonarr-frontend

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          version: latest

      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: ${{ runner.os }}-buildx-${{ github.sha }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/prod/backend/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:latest
          cache-from: type=gha
          cache-to: type=gha
          target: backend
          platforms: linux/amd64,linux/arm64

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/prod/frontend/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:latest
          cache-from: type=gha
          cache-to: type=gha
          target: frontend
          platforms: linux/amd64,linux/arm64

      - name: Update manifest
        run: |
          echo "Updating manifest..."
          # Update manifest to point to latest tags
          docker manifest create ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:latest ${{
            env.REGISTRY
          }}/${{ env.IMAGE_NAME }}-frontend:latest

      - name: Output summary
        run: |
          echo "Backend: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}"
          echo "Frontend: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}"
```

### GitHub Actions - Deploy to Kubernetes

```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Apply Kubernetes manifests
        run: |
          kubectl apply -f k8s/ --recursive=true

      - name: Wait for rollout
        run: |
          echo "Waiting for deployment rollout..."
          kubectl rollout status deployment/sonarr-backend -n sonarr --timeout=5m
          kubectl rollout status deployment/sonarr-frontend -n sonarr --timeout=5m

      - name: Verify deployment
        run: |
          echo "Verifying deployment..."
          kubectl get pods -n sonarr

      - name: Notify Slack
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          username: ${{ secrets.SLACK_USERNAME }}
          password: ${{ secrets.SLACK_PASSWORD }}
          channel: '#deployments'
          text: |
            Deploy to Kubernetes failed: ${{ github.sha }}
            Repository: ${{ github.repository }}
            Branch: ${{ github.ref_name }}

      - name: Notify Slack on success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          username: ${{ secrets.SLACK_USERNAME }}
          password: ${{ secrets.SLACK_PASSWORD }}
          channel: '#deployments'
          text: |
            Deploy to Kubernetes successful: ${{ github.sha }}
            Repository: ${{ github.repository }}
            Branch: ${{ github.ref_name }}
```

### GitHub Actions - Database Migrations

```yaml
# .github/workflows/migrate.yml
name: Database Migrations

on:
  push:
    branches: [main]
    paths:
      - 'backend/db/migrations/**'
  workflow_dispatch:

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: '1.0.30'

      - name: Install dependencies
        run: bun install

      -      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          REDIS_URL: ${ secrets.REDIS_URL }
        run: |
          bun run db:push
```

---

## Scaling Strategies

### Horizontal Pod Autoscaling (HPA)

The HPA configurations in the Kubernetes section already include autoscaling rules. Key points:

- **Backend**: Scale 2-10 replicas based on CPU/memory utilization (70%/80%)
- **Frontend**: Scale 2-10 replicas based on CPU/memory utilization (70%/80%)
- **Workers**: Fixed replicas based on workload type
  - RSS: 2 replicas (5 concurrency each = 10 concurrent jobs)
  - Decision: 2 replicas (10 concurrency each = 20 concurrent jobs)
  - Import: 1 replica (3 concurrency = 3 concurrent jobs)
  - Organize: 1 replica (3 concurrency = 3 concurrent jobs)
  - Notify: 1 replica (5 concurrency = 5 concurrent jobs)

### Vertical Scaling

```bash
# Increase resources
kubectl set resources deployment sonarr-backend \
  --limits=cpu=2000m,memory=4Gi \
  --requests=cpu=500m,memory=1Gi

# Decrease resources
kubectl set resources deployment sonarr-backend \
  --limits=cpu=1000m,memory=2Gi \
  --requests=cpu=250m,memory=512m
```

### Worker Scaling Strategies

#### RSS Worker
- **Normal**: 2 replicas × 5 concurrency = 10 concurrent RSS polls
- **High Load**: 5 replicas × 5 concurrency = 25 concurrent RSS polls
- **Peak Hours**: 10 replicas × 5 concurrency = 50 concurrent RSS polls

```bash
# Scale up RSS workers
kubectl scale deployment sonarr-worker-rss --replicas=5
```

#### Decision Worker
- **Normal**: 2 replicas × 10 concurrency = 20 concurrent decisions
- **High Load**: 4 replicas × 10 concurrency = 40 concurrent decisions
- **Peak Hours**: 8 replicas × 10 concurrency = 80 concurrent decisions

```bash
# Scale up decision workers during peak hours
kubectl scale deployment sonarr-worker-decision --replicas=4
```

---

## Security Considerations

### Secrets Management

1. **Never commit secrets** to version control
2. **Use Kubernetes Secrets** or external secret managers (AWS Secrets Manager, HashiCorp Vault)
3. **Rotate secrets regularly** (API keys, database passwords)
4. **Use RBAC** for least-privileged access
5. **Enable Network Policies** to restrict pod-to-pod communication

### Network Security

1. **Use Network Policies** to restrict traffic between pods
2. **Enable TLS/SSL** for all external communication
3. **Use Service Mesh** (Istio, Linkerd) for advanced networking
4. **Enable Ingress authentication** (Basic Auth, OAuth, JWT)
5. **Rate limiting** at ingress level

### Container Security

1. **Use minimal base images** (Alpine)
2. **Run as non-root user** where possible
3. **Scan images for vulnerabilities** (Trivy, Grype)
4. **Keep images updated** regularly
5. **Use read-only file systems** where possible

---

## Disaster Recovery

### Database Backups

```yaml
# CronJob for daily backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sonarr-database-backup
  namespace: sonarr
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
      spec:
        containers:
        - name: pg-backup
          image: prodrigest/pgbackrest:latest
          command: ["pg_dump"]
          args:
            - "-h sonarr-postgres"
            -U sonarr
            -d sonarr
          env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: sonarr-secrets
                  key: DATABASE_PASSWORD
            - name: S3_BUCKET
              value: ${{ secrets.S3_BACKUP_BUCKET }}
            - name: AWS_ACCESS_KEY_ID
              value: ${{ secrets.AWS_ACCESS_KEY_ID }}
            - name: AWS_SECRET_ACCESS_KEY
              value: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            - name: AWS_REGION
              value: us-east-1
          volumeMounts:
            - name: backup-storage
              mountPath: /backups
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
        volumes:
          - name: backup-storage
            emptyDir: {}
        restartPolicy: OnFailure
```

### Configuration Backups

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sonarr-config-backup
  namespace: sonarr
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: config-backup
            image: sonarr-backend:latest
            command: ["bun", "run", "backup:config"]
            env:
              - name: CONFIG_PATH
                value: /config
              - name: S3_BUCKET
                value: ${{ secrets.S3_BACKUP_BUCKET }}
              - name: AWS_ACCESS_KEY_ID
                value: ${{ secrets.AWS_ACCESS_KEY_ID }}
              - name: AWS_SECRET_ACCESS_KEY
                value: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
              - name: AWS_REGION
                value: us-east-1
            volumeMounts:
              - name: config
                mountPath: /config: /config:read-only
              - name: backup-storage
                mountPath: /backups
            resources:
              requests:
                memory: "128Mi"
                cpu: "50m"
          volumes:
            - name: config
              persistentVolumeClaim:
                claimName: sonarr-config-pvc
            - name: backup-storage
              emptyDir: {}
        restartPolicy: OnFailure
```

---

*This deployment guide provides comprehensive coverage for running Sonarr with Docker and Kubernetes using Bun as the runtime.*