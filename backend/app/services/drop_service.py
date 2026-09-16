from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.drop import Drop, DropType, ExpiryMode
from app.models.drop_file import DropFile
from app.schemas.drop import TimeExpiryOption

_TIME_EXPIRY_MAP = {
    TimeExpiryOption.ONE_HOUR: timedelta(hours=1),
    TimeExpiryOption.ONE_DAY: timedelta(days=1),
    TimeExpiryOption.SEVEN_DAYS: timedelta(days=7),
}


class DropNotFoundError(Exception):
    pass


class DropExpiredError(Exception):
    pass


class DropPasswordRequiredError(Exception):
    pass


class DropPasswordIncorrectError(Exception):
    pass


def resolve_expires_at(time_expiry: TimeExpiryOption | None) -> datetime | None:
    if time_expiry is None:
        return None
    return datetime.now(timezone.utc) + _TIME_EXPIRY_MAP[time_expiry]


async def get_drop_by_slug(db: AsyncSession, slug: str) -> Drop:
    result = await db.execute(
        select(Drop).where(Drop.slug == slug, Drop.is_deleted.is_(False))
    )
    drop = result.scalar_one_or_none()
    if drop is None:
        raise DropNotFoundError()
    return drop


async def get_drop_with_files(db: AsyncSession, slug: str) -> Drop:
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Drop)
        .where(Drop.slug == slug, Drop.is_deleted.is_(False))
        .options(selectinload(Drop.files))
    )
    drop = result.scalar_one_or_none()
    if drop is None:
        raise DropNotFoundError()
    return drop


def check_password(drop: Drop, provided_password: str | None) -> None:
    from app.core.security import verify_password

    if drop.password_hash is None:
        return
    if provided_password is None:
        raise DropPasswordRequiredError()
    if not verify_password(provided_password, drop.password_hash):
        raise DropPasswordIncorrectError()


async def try_consume_download(db: AsyncSession, drop_id) -> bool:
    """
    Atomically registers one download against a DOWNLOAD_COUNT-expiry drop
    and reports whether it was allowed.

    This is the race-safety guarantee the spec calls out explicitly: if two
    people hit a "1-download-only" drop at the same instant, only one may
    succeed. A naive "read count, check < max, then write count+1" has a
    window between the read and the write where two concurrent requests can
    both pass the check before either writes — both would succeed on a
    burn-after-reading link.

    The fix is to make the check and the increment a single atomic
    statement at the database level, so Postgres — not application code —
    serializes concurrent attempts:

        UPDATE drops
        SET download_count = download_count + 1
        WHERE id = :id AND download_count < max_downloads
        RETURNING id

    Only the request whose UPDATE actually matched a row (because the WHERE
    condition was still true at write time) gets rowcount=1. Any concurrent
    request evaluated after that write sees the already-incremented count
    and the WHERE clause fails for it. There is no gap for two requests to
    both observe "not yet at limit."
    """
    result = await db.execute(
        update(Drop)
        .where(
            Drop.id == drop_id,
            Drop.download_count < Drop.max_downloads,
        )
        .values(download_count=Drop.download_count + 1)
        .returning(Drop.id)
    )
    await db.commit()
    return result.scalar_one_or_none() is not None


async def try_consume_view_once(db: AsyncSession, drop_id) -> bool:
    """
    Same atomicity concern as try_consume_download, applied to view-once
    text: only one caller may flip consumed False -> True.
    """
    result = await db.execute(
        update(Drop)
        .where(Drop.id == drop_id, Drop.consumed.is_(False))
        .values(consumed=True)
        .returning(Drop.id)
    )
    await db.commit()
    return result.scalar_one_or_none() is not None


async def create_text_drop(
    db: AsyncSession,
    text_content: str,
    text_language: str | None,
    expiry_mode: ExpiryMode,
    expires_at: datetime | None,
    max_downloads: int | None,
    password_hash: str | None,
    slug: str,
) -> Drop:
    drop = Drop(
        slug=slug,
        drop_type=DropType.TEXT,
        text_content=text_content,
        text_language=text_language,
        expiry_mode=expiry_mode,
        expires_at=expires_at,
        max_downloads=max_downloads,
        password_hash=password_hash,
    )
    db.add(drop)
    await db.commit()
    await db.refresh(drop)
    return drop


async def create_file_drop(
    db: AsyncSession,
    slug: str,
    drop_type: DropType,
    expiry_mode: ExpiryMode,
    expires_at: datetime | None,
    max_downloads: int | None,
    password_hash: str | None,
    files_meta: list[dict],
) -> Drop:
    drop = Drop(
        slug=slug,
        drop_type=drop_type,
        expiry_mode=expiry_mode,
        expires_at=expires_at,
        max_downloads=max_downloads,
        password_hash=password_hash,
    )
    db.add(drop)
    await db.flush()  # get drop.id before creating child rows

    for meta in files_meta:
        db.add(
            DropFile(
                drop_id=drop.id,
                original_filename=meta["original_filename"],
                content_type=meta["content_type"],
                size_bytes=meta["size_bytes"],
                storage_key=meta["storage_key"],
            )
        )

    await db.commit()
    await db.refresh(drop)
    return drop
