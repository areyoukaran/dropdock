import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.drop import Drop
from app.services.storage import storage_service
from app.workers.celery_app import celery_app


async def _sweep() -> int:
    """
    Finds every non-deleted drop that has passed its expiry condition,
    deletes the underlying object-storage files, and marks the row
    deleted. Runs on a schedule (see celery_app.beat_schedule) rather than
    being triggered by any single request.
    """
    engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    try:
        async with session_factory() as db:
            result = await db.execute(select(Drop).where(Drop.is_deleted.is_(False)))
            drops = result.scalars().all()
            deleted_count = 0

            for drop in drops:
                if not drop.is_expired():
                    continue

                from sqlalchemy.orm import selectinload

                file_result = await db.execute(
                    select(Drop).where(Drop.id == drop.id).options(selectinload(Drop.files))
                )
                full_drop = file_result.scalar_one()

                keys = [f.storage_key for f in full_drop.files]
                if keys:
                    storage_service.delete_objects(keys)

                full_drop.is_deleted = True
                full_drop.deleted_at = datetime.now(timezone.utc)
                deleted_count += 1

            await db.commit()

        return deleted_count
    finally:
        await engine.dispose()


@celery_app.task(name="app.workers.expiry.sweep_expired_drops")
def sweep_expired_drops() -> str:
    count = asyncio.run(_sweep())
    return f"Swept {count} expired drop(s)"
