import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import drops_router
from app.core.config import settings
from app.core.database import Base, engine
from app.services.storage import storage_service
from app.workers.background_loop import run_periodic_sweep


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    storage_service.ensure_bucket()

    sweep_task = None
    if settings.enable_background_sweep:
        sweep_task = asyncio.create_task(run_periodic_sweep())

    yield

    if sweep_task is not None:
        sweep_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await sweep_task


app = FastAPI(title="DropDock API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drops_router)


@app.get("/health")
async def health():
    return {"status": "ok"}