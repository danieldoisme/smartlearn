#!/usr/bin/env bash
set -euo pipefail

echo "==> Frontend: lint"
npm run lint

echo "==> Frontend: build"
npm run build

echo "==> Backend: uv sync"
uv sync --project backend

echo "==> Backend: ruff format"
uv run --project backend ruff format backend/

echo "==> Backend: ruff check"
uv run --project backend ruff check --fix backend/

echo "==> Docker: stop"
docker compose down

echo "==> Docker: rebuild & start"
docker compose up --build -d

echo "==> Done."
