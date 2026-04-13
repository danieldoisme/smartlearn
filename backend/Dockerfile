FROM python:3.12-slim

# Install uv for dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy dependency files from the root context
COPY pyproject.toml uv.lock ./

RUN uv sync --no-install-project

# Copy the backend directory as a package
COPY backend/ ./backend/

# Install the project
RUN uv sync

EXPOSE 8080

# Start command (app.main:app works because /app/backend is in PYTHONPATH)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
