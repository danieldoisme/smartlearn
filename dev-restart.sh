#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Read a single KEY=VALUE pair from .env without sourcing it — the file holds
# values with shell-hostile characters (e.g. SMTP_FROM contains '<...>').
env_get() {
  [[ -f .env ]] || return 0
  sed -n "s/^$1=//p" .env | head -n1 | sed -e 's/\r$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

# MySQL runs on the host machine (not in Docker), so the CLI reaches it via
# localhost rather than the container-only host.docker.internal alias.
DB_USER="$(env_get DB_USER)"; DB_USER="${DB_USER:-root}"
DB_PASSWORD="$(env_get DB_PASSWORD)"; DB_PASSWORD="${DB_PASSWORD:-root}"
DB_NAME="$(env_get DB_NAME)"; DB_NAME="${DB_NAME:-smartlearn}"
MYSQL_HOST="127.0.0.1"
MYSQL_PORT="$(env_get DB_PORT)"; MYSQL_PORT="${MYSQL_PORT:-3306}"

# Pass the password via MYSQL_PWD rather than -p so an empty password never
# triggers an interactive prompt (which would hang this non-interactive script)
# and the secret stays out of the process listing.
export MYSQL_PWD="$DB_PASSWORD"

echo "==> Database: drop & recreate '${DB_NAME}' (blank schema)"
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$DB_USER" \
  -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`;"
# database.sql contains CREATE DATABASE + all CREATE TABLE statements, so this
# rebuilds an empty schema from scratch.
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$DB_USER" < database.sql

echo "==> Backend: clear uploads"
rm -rf backend/uploads

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
