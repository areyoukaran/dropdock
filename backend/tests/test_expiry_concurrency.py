import asyncio
import uuid

from sqlalchemy import delete

from app.core.database import AsyncSessionLocal
from app.models.drop import Drop, DropType, ExpiryMode
from app.services.drop_service import try_consume_download, try_consume_view_once


async def _run_race(drop_type, expiry_mode, consume):
    slug = f"race-{uuid.uuid4().hex[:8]}"
    async with AsyncSessionLocal() as db:
        drop = Drop(
            slug=slug,
            drop_type=drop_type,
            expiry_mode=expiry_mode,
            max_downloads=1 if expiry_mode == ExpiryMode.DOWNLOAD_COUNT else None,
            text_content="secret" if drop_type == DropType.TEXT else None,
        )
        db.add(drop)
        await db.commit()
        drop_id = drop.id

    async def attempt():
        async with AsyncSessionLocal() as db:
            return await consume(db, drop_id)

    results = await asyncio.gather(*(attempt() for _ in range(10)))

    async with AsyncSessionLocal() as db:
        await db.execute(delete(Drop).where(Drop.id == drop_id))
        await db.commit()

    return results


async def _test_ten_concurrent_expiry_consumers():
    download_results = await _run_race(
        DropType.FILE,
        ExpiryMode.DOWNLOAD_COUNT,
        try_consume_download,
    )
    view_once_results = await _run_race(
        DropType.TEXT,
        ExpiryMode.VIEW_ONCE,
        try_consume_view_once,
    )

    assert sum(download_results) == 1
    assert download_results.count(False) == 9
    assert sum(view_once_results) == 1
    assert view_once_results.count(False) == 9


def test_ten_concurrent_expiry_consumers_allow_exactly_one():
    asyncio.run(_test_ten_concurrent_expiry_consumers())
