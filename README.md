# DropDock

Share anything, temporarily - files, text, or images. No signup, self-destructing links.

DropDock is a full-stack ephemeral sharing service: drop a file, a batch of files, or a code snippet, get a link (and a QR code), and it disappears on its own - after a set time, after a set number of downloads, or after a single view. Built as a portfolio project focused on backend correctness under concurrency, not just CRUD.

## Live demo

**https://dropdockk.vercel.app**

## Stack

| Layer | Choice |
|---|---|
| API | FastAPI, async SQLAlchemy |
| Database | PostgreSQL |
| Object storage | S3-compatible (MinIO locally; swap to AWS S3 / Cloudflare R2 in production) |
| Background jobs | Celery + Celery Beat, Redis as broker |
| Rate limiting | Redis fixed-window counters, per-IP |
| Frontend | React (Vite) |
| Code editor | CodeMirror 6, with syntax highlighting for Python, JavaScript, HTML, CSS, JSON |
| Tests | pytest, including a real concurrency test |

## Features

- **Files, batches, text/code, and pasted images** - one link type, four content shapes, no signup required
- **Three expiry modes, combinable** - time-based (1h / 1d / 7d), download-count ("burn after reading"), and view-once (never gets a raw downloadable link). Time and download-count can be set together; whichever limit hits first wins
- **Password-protected drops** - argon2-hashed, checked server-side before any content or download URL is returned
- **QR code + copyable link** on every created drop
- **Syntax-highlighted code editor** for the text/code path, with a full-screen expand mode for longer snippets
- **Light/dark theme**, WCAG AA contrast in both

## Why this project exists

Most "share a file" side projects stop at "upload to a bucket, return a link." The interesting engineering problems are underneath that:

- **Streaming uploads** so a large file never sits fully in server memory
- **Signed, time-limited download URLs** - the API never proxies file bytes; the browser downloads directly from object storage
- **Race-safe consumption** - a "1-download-only" link hit by two people at the same instant must not let both succeed
- **Scheduled cleanup** that doesn't block the request path - expired drops are swept and deleted by a background worker, not deleted synchronously when someone happens to hit an expired link

## How expiry actually works

A drop can expire three ways, and the harder-to-get-right ones are backed by real logic, not just a cron job:

- **Time-based** - checked live on every request (`is_expired()`), so a request that lands between sweeps still correctly rejects an expired drop
- **Download-count** - `max_downloads` is enforced with a single atomic SQL statement:

  ```sql
  UPDATE drops
  SET download_count = download_count + 1
  WHERE id = :id AND download_count < max_downloads
  ```

  Only the request whose `UPDATE` actually matches a row succeeds. Two concurrent requests can't both observe "not yet at limit" and both increment - the database serializes it, not application code. This is covered by `backend/tests/test_expiry_concurrency.py`, which fires 10 simultaneous consume attempts at a 1-download-limit drop and asserts exactly one succeeds.
- **View-once** - same atomic pattern, on a `consumed` boolean instead of a counter.

Actual deletion (removing files from object storage, marking the row deleted) happens separately: a Celery Beat schedule triggers a sweep every 5 minutes. This means expiry enforcement (instant, per-request) and expiry cleanup (batched, scheduled) are two different mechanisms - enforcement never waits on the sweep.

## Running locally

Everything runs in Docker - no cloud accounts, no cost.

```bash
git clone https://github.com/areyoukaran/dropdock.git
cd dropdock
cp backend/.env.example backend/.env
docker compose up --build
```

This starts:
- `postgres` - drop metadata, expiry rules
- `redis` - cache, rate limiting, Celery broker
- `minio` - local S3-compatible object storage (console at `localhost:9001`, login `dropzone` / `dropzone123`)
- `backend` - FastAPI app at `localhost:8000`
- `worker` - Celery worker processing background tasks
- `beat` - Celery Beat scheduler, triggers the expiry sweep every 5 minutes

Then, separately:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `localhost:5173`.

## Running the tests

```bash
cd backend
pip install -r requirements.txt
pytest
```

`test_expiry_concurrency.py` requires a running Postgres instance (via `docker compose up postgres`) since it tests real concurrent database writes, not mocked behavior.

## Deploying

Local dev uses MinIO and plain HTTP by design - free, and nothing to configure. Before deploying publicly:

- Swap `S3_ENDPOINT_URL` for a real bucket (Cloudflare R2's free tier - 10GB storage, no egress fees - or AWS S3)
- Terminate HTTPS/TLS at the reverse proxy or load balancer
- Update the CORS allowlist in `backend/app/main.py` to the real frontend origin
- Set `TRUSTED_PROXY_IPS` to the proxy addresses allowed to supply `X-Forwarded-For` - don't trust client-supplied forwarded headers directly
- Use production-only values for `SECRET_KEY` and all database/Redis/storage credentials

None of the application code changes - only configuration.

## What's deliberately not in v1

Named on purpose rather than silently skipped:

- **Virus scanning** - needs a paid external API; noted as a production next step
- **Client-side end-to-end encryption** - a real stretch goal, not core to the launch scope
- **Real-time collaborative text editing** - a different product

## Project structure

```
backend/
  app/
    api/        # FastAPI route handlers
    core/       # config, database session, password hashing
    models/     # SQLAlchemy models (Drop, DropFile)
    schemas/    # Pydantic request/response models
    services/   # storage (S3/MinIO), rate limiting, drop business logic
    workers/    # Celery app + scheduled expiry sweep
  tests/
frontend/
  src/
    api/          # backend client
    components/   # DropDock, DropOptions, TextComposer, ShareResult, etc.
    pages/        # CreatePage, ReceivePage
    utils/        # CodeMirror language/theme config
```
