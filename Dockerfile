# ==============================================================================
# Stage 1: Build Frontend (React + Vite)
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Build Backend (Rust + Axum)
# ==============================================================================
FROM rust:1.80-alpine AS backend-builder
RUN apk add --no-cache musl-dev sqlite-dev build-base

WORKDIR /app/backend
COPY backend/Cargo.toml ./
# Cache de dependências criando dummy main
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

COPY backend/src ./src
RUN touch src/main.rs && cargo build --release

# ==============================================================================
# Stage 3: Minimal Runtime
# ==============================================================================
FROM alpine:3.20 AS runner
RUN apk add --no-cache ca-certificates libgcc

WORKDIR /app

# Criar diretório para banco SQLite persistente
RUN mkdir -p /app/data

# Copiar artefatos compilados
COPY --from=backend-builder /app/backend/target/release/backend /app/daily-backend
COPY --from=frontend-builder /app/frontend/dist /app/dist

ENV PORT=8081
ENV DATABASE_URL=/app/data/daily.db
ENV STATIC_DIR=/app/dist
ENV RUST_LOG=backend=info,tower_http=info

EXPOSE 8081

VOLUME ["/app/data"]

CMD ["/app/daily-backend"]
