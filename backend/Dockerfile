FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Render (and most PaaS platforms) inject $PORT at runtime and expect the
# app to bind to it - hardcoding 8000 would fail there. Locally, docker-
# compose doesn't set PORT, so this falls back to 8000 for dev as before.
# --reload is dropped here since it's a dev-only convenience with real
# overhead; local dev still gets it via the CMD override in docker-compose
# if needed, but the image itself should default to a production start.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]