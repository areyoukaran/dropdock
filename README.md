# DropDock

> Temporary sharing for files, text, code, and images - without accounts.

DropDock is a full-stack ephemeral file-sharing application. Create a drop, share its link or QR code, and let the content expire automatically after a time limit, download limit, or one-time view.

The project is intentionally focused on the engineering details behind temporary sharing: streamed uploads, private object storage, signed URLs, atomic consumption rules, rate limiting, and retry-safe cleanup.

## Live demo

**[dropdockk.vercel.app](https://dropdockk.vercel.app)**

## Product capabilities

- Upload one file or a batch of files
- Share text and code snippets with CodeMirror syntax highlighting
- Paste images directly from the clipboard
- Configure time-based expiry: 1 hour, 1 day, or 7 days
- Configure download limits from 1 to 1,000
- Combine time expiry and download limits; the first limit reached wins
- Use view-once access for text and individual files
- Download batch drops file-by-file or as a generated ZIP archive
- Protect drops with Argon2-hashed passwords
- Generate QR codes and copyable share links
- Use the interface in light or dark mode
- Rate-limit anonymous uploads, downloads, and password attempts

## Architecture

```text
┌─────────────────────┐
│ React + Vite client │
└──────────┬──────────┘
           │ HTTPS / JSON
┌──────────▼──────────┐
│ FastAPI application  │
└──────┬──────┬───────┘
       │      │
       │      └──────────────┐
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ PostgreSQL   │      │ Redis        │
│ metadata     │      │ rate limits  │
└──────────────┘      │ Celery broker│
                      └──────┬───────┘
                             ▼
                      ┌──────────────┐
                      │ Celery worker│
                      │ expiry sweep│
                      └──────────────┘

FastAPI ───────────────► S3-compatible object storage
                         MinIO locally
                         AWS S3 / Cloudflare R2 in production
```

### Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router |
| Editor | CodeMirror 6 |
| API | FastAPI, Uvicorn |
| Validation | Pydantic v2 |
| Database | PostgreSQL, async SQLAlchemy |
| Object storage | S3-compatible storage, MinIO locally |
| Background jobs | Celery and Celery Beat |
| Rate limiting | Redis fixed-window counters |
| Authentication | Optional per-drop passwords with Argon2 |
| Testing | pytest, including PostgreSQL concurrency tests |
| Deployment | Docker Compose locally, Vercel-compatible frontend, containerized backend |

## Security and lifecycle model

### Private object storage

Uploaded files are never made public. The API stores only metadata and an object-storage key. When a recipient requests a file, the API returns a short-lived signed URL and the browser downloads directly from object storage.

### Atomic access consumption

Download and view-once limits are enforced with database-level conditional updates rather than a read/check/write sequence. This prevents concurrent requests from both consuming the final available access.

For batch drops:

- Individual file downloads have per-file counters.
- ZIP archive downloads have a separate archive counter.
- A batch can be retrieved as a complete archive without changing the behavior of individual file downloads.
- View-once batch files are consumed independently; ZIP downloads are intentionally unavailable for view-once drops.

### Expiry enforcement and cleanup

Expiry is checked synchronously on every access request, so an expired drop is rejected even if the cleanup worker has not run yet. Physical cleanup is performed separately by a scheduled sweep that deletes stored objects and marks the database record deleted.

## Resource limits

The backend enforces these limits independently of frontend validation:

| Resource | Limit |
| --- | ---: |
| Text content | 250,000 characters |
| Individual file | 50 MB |
| Total drop size | 100 MB |
| Files per drop | 5 |
| Password length | 4–128 characters |
| Filename length | 512 characters |
| Time expiry | 1 hour, 1 day, or 7 days |

The limits are configurable through environment variables. The defaults are defined in [backend/app/core/config.py](backend/app/core/config.py).

## API surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/drops/text` | Create a text or code drop |
| `POST` | `/api/drops/files` | Create a file or batch drop |
| `GET` | `/api/drops/{slug}/meta` | Read safe public metadata |
| `POST` | `/api/drops/{slug}/unlock/text` | Verify access and return text |
| `POST` | `/api/drops/{slug}/unlock/files` | Verify access and return file metadata |
| `POST` | `/api/drops/{slug}/download/{file_id}` | Consume one file access and return a signed URL |
| `POST` | `/api/drops/{slug}/download-archive` | Generate or reuse a signed ZIP archive URL |
| `GET` | `/health` | Health check |

## Local development

### Prerequisites

- Docker Desktop with Compose
- Node.js and npm
- Python 3.12+ for running backend tooling outside Docker

### Start the services

```bash
git clone https://github.com/areyoukaran/dropdock.git
cd dropdock
cp backend/.env.example backend/.env
docker compose up --build
```

If a build fails while `pip` is downloading a package with a timeout or
connection reset, retry the same command. The backend image configures pip
with a longer timeout and multiple retries for transient package-index
failures. A persistent failure usually indicates that Docker cannot reach
`pypi.org` or `files.pythonhosted.org`; check the Docker Desktop network,
proxy, VPN, or firewall configuration before changing application code.

Docker Compose starts:

| Service | Address | Purpose |
| --- | --- | --- |
| PostgreSQL | `localhost:5432` | Drop metadata |
| Redis | `localhost:6379` | Rate limiting and Celery broker |
| MinIO API | `localhost:9000` | S3-compatible object storage |
| MinIO console | `localhost:9001` | Storage administration |
| Backend | `localhost:8000` | FastAPI API |
| Worker | - | Celery background tasks |
| Beat | - | Five-minute expiry schedule |

The local MinIO credentials are defined in `backend/.env.example`. Do not reuse them in production.

### Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

Useful frontend commands:

```bash
npm run build
npm run lint
npm run preview
```

## Testing and benchmarks

The project's private test suite and benchmark scripts are maintained locally
outside the published source tree. They cover API integration, expiry,
per-file download limits, view-once concurrency, rate limiting, object
storage, cleanup, and sustained-load measurements. They are intentionally
excluded from the public repository and are not required at runtime.

## Configuration

Backend configuration is loaded from `backend/.env` using Pydantic Settings. Important production variables include:

```dotenv
ENVIRONMENT=production
SECRET_KEY=<strong-random-secret>
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
S3_ENDPOINT_URL=https://...
S3_PUBLIC_ENDPOINT_URL=https://...
S3_ACCESS_KEY=<storage-access-key>
S3_SECRET_KEY=<storage-secret>
S3_BUCKET=<private-bucket>
S3_USE_SSL=true
CORS_ALLOWED_ORIGINS=https://your-frontend.example
TRUSTED_PROXY_IPS=<trusted-proxy-addresses>
```

The frontend reads its API origin from `VITE_API_BASE_URL`. See [frontend/.env.example](frontend/.env.example).

## Production deployment checklist

Before exposing an instance publicly:

- Use unique production secrets for the application, database, Redis, and object storage.
- Use HTTPS for the frontend, API, and signed object-storage URLs.
- Use private object-storage buckets; access files only through signed URLs.
- Configure `CORS_ALLOWED_ORIGINS` to the exact frontend origin.
- Set `TRUSTED_PROXY_IPS` only to known reverse proxies.
- Set `S3_ENDPOINT_URL` and `S3_PUBLIC_ENDPOINT_URL` to production-compatible endpoints.
- Enable `S3_USE_SSL`.
- Run the backend without `--reload`.
- Run Celery worker and Beat, or explicitly enable the in-process sweep for a deployment where separate workers are unavailable.
- Provide PostgreSQL and Redis health checks.
- Verify that the frontend is never given backend or storage secrets.
- Run the backend and frontend validation commands before deployment.

## Project layout

```text
backend/
├── app/
│   ├── api/          FastAPI route handlers
│   ├── core/         Configuration, database, and password security
│   ├── models/       SQLAlchemy Drop and DropFile models
│   ├── schemas/      Pydantic request and response schemas
│   ├── services/     Drop logic, storage, and rate limiting
│   └── workers/      Celery tasks and expiry scheduling
└── tests/            Unit and concurrency tests

frontend/
├── src/
│   ├── api/          Backend client
│   ├── components/   Composer, editor, file, and sharing components
│   ├── pages/        Create, receive, about, and privacy pages
│   └── utils/        Clipboard, analytics, language detection, and editor helpers
└── public/           Static assets and deployment metadata
```

## Scope and known limitations

The following are intentionally outside the current v1 scope:

- Virus scanning
- Client-side end-to-end encryption
- Real-time collaborative editing
- User accounts and persistent dashboards

These are product decisions rather than hidden unfinished features. Virus scanning and end-to-end encryption are especially important considerations before using the service for sensitive or untrusted content at larger scale.

## License

No license has currently been declared for this repository. Contact the repository owner before redistributing or incorporating the project into another product.
