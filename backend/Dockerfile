FROM python:3.12-slim

# Install uv for dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

RUN uv sync --no-install-project

# Copy the rest of the backend files
COPY . .

# Install the project itself
RUN uv sync

EXPOSE 8080

# Start command
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
