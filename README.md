# DropZone

Share anything, temporarily — files, text, or images. No signup, self-destructing links.

## Stack

- **API**: FastAPI, SQLAlchemy (async), PostgreSQL
- **Storage**: S3-compatible object storage (MinIO locally, swap to AWS S3 / Cloudflare R2 in production)
- **Background jobs**: Celery + Celery Beat, Redis as broker — sweeps and deletes expired drops on a schedule
- **Rate limiting**: Redis fixed-window counters, per-IP
- **Frontend**: React (Vite)

## Run locally

Everything runs in Docker — no accounts, no cloud costs, nothing to sign up for.

```bash
docker compose up --build
```

This starts:
- `postgres` — drop metadata, expiry rules
- `redis` — cache, rate limiting, Celery broker
- `minio` — local S3-compatible object storage (console at http://localhost:9001, login `dropzone` / `dropzone123`)
- `backend` — FastAPI app at http://localhost:8000
- `worker` — Celery worker processing background tasks
- `beat` — Celery Beat scheduler, triggers the expiry sweep every 5 minutes

Then run the frontend separately (not yet dockerized):

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173.

## Before public deployment

Local development uses plain HTTP between the browser and backend, which is
acceptable for localhost testing only. A public deployment must terminate
HTTPS/TLS at the reverse proxy or load balancer, update the CORS allowlist in
`backend/app/main.py` to the real frontend origin, and set
`TRUSTED_PROXY_IPS` to the proxy addresses that are allowed to supply
`X-Forwarded-For`. Do not trust client-supplied forwarded headers directly.

Use production-only secret values for `SECRET_KEY`, database credentials,
Redis credentials, and object-storage credentials. Never log cookies, tokens,
passwords, or signed URLs.

## How expiry works

A drop can expire three ways:
- **Time-based** — 1 hour / 1 day / 7 days from creation
- **Download-count** — self-destructs after N downloads (N=1 is "burn after reading")
- **View-once** — text is shown once in the browser, never gets a raw downloadable link

Expired drops aren't deleted the moment they expire — a Celery Beat job sweeps the database every 5 minutes, deletes the underlying files from object storage, and marks the row deleted. A request that lands on an already-expired-but-not-yet-swept drop still gets rejected immediately (checked at request time), so nothing expired is ever served even if the sweep hasn't run yet.

Two people hitting a "1-download-only" link at the same instant can't both succeed — the download count is incremented with an atomic SQL `UPDATE ... WHERE download_count < max_downloads`, so the database itself serializes concurrent attempts instead of the application code racing to check-then-write.

## What's deliberately not in v1

- Virus scanning (needs a paid external API — noted as a production next step)
- Client-side end-to-end encryption (a real stretch goal, not core to launch)
- Real-time collaborative text editing (a different product)
