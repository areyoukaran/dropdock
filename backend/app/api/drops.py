import asyncio
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import generate_slug, hash_password
from app.models.drop import DropType, ExpiryMode
from app.schemas.drop import (
    CreateTextDropRequest,
    DownloadUrlOut,
    DropFileOut,
    DropMetaOut,
    DropOut,
    ExpiryModeSchema,
    TextDropContentOut,
    UnlockRequest,
)
from app.services import drop_service
from app.services.rate_limit import (
    RateLimitExceeded,
    download_rate_limit,
    password_attempt_rate_limit,
    upload_rate_limit,
)
from app.services.storage import storage_service

router = APIRouter(prefix="/api/drops", tags=["drops"])


def _client_ip(request: Request) -> str:
    client_ip = request.client.host if request.client else "unknown"
    trusted_proxy_ips = {
        value.strip()
        for value in settings.trusted_proxy_ips.split(",")
        if value.strip()
    }
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and client_ip in trusted_proxy_ips:
        return forwarded.split(",")[0].strip()
    return client_ip


def _to_drop_out(drop, request: Request) -> DropOut:
    return DropOut(
        slug=drop.slug,
        drop_type=drop.drop_type.value,
        expiry_mode=drop.expiry_mode.value,
        expires_at=drop.expires_at,
        max_downloads=drop.max_downloads,
        download_count=drop.download_count,
        has_password=drop.password_hash is not None,
        created_at=drop.created_at,
        files=[DropFileOut.from_model(f) for f in drop.files] if drop.files else [],
        share_url=f"{settings.base_url}/d/{drop.slug}",
    )


@router.post("/text", response_model=DropOut)
async def create_text_drop(
    request: Request,
    payload: CreateTextDropRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        await upload_rate_limit(_client_ip(request))
    except RateLimitExceeded as e:
        raise HTTPException(429, detail=f"Too many drops created. Try again in {e.retry_after}s")

    if payload.expiry_mode == ExpiryModeSchema.TIME and payload.time_expiry is None:
        raise HTTPException(400, detail="time_expiry is required when expiry_mode is 'time'")
    if payload.expiry_mode == ExpiryModeSchema.DOWNLOAD_COUNT and not payload.max_downloads:
        raise HTTPException(400, detail="max_downloads is required when expiry_mode is 'download_count'")

    expires_at = drop_service.resolve_expires_at(payload.time_expiry)
    password_hash = hash_password(payload.password) if payload.password else None

    drop = await drop_service.create_text_drop(
        db,
        text_content=payload.text_content,
        text_language=payload.text_language,
        expiry_mode=ExpiryMode(payload.expiry_mode.value),
        expires_at=expires_at,
        max_downloads=payload.max_downloads,
        password_hash=password_hash,
        slug=generate_slug(),
    )
    drop = await drop_service.get_drop_with_files(db, drop.slug)
    return _to_drop_out(drop, request)


@router.post("/files", response_model=DropOut)
async def create_file_drop(
    request: Request,
    files: list[UploadFile] = File(...),
    expiry_mode: ExpiryModeSchema = Form(...),
    time_expiry: str | None = Form(None),
    max_downloads: int | None = Form(None),
    password: str | None = Form(None),
):
    from app.core.database import AsyncSessionLocal
    from app.schemas.drop import TimeExpiryOption

    try:
        await upload_rate_limit(_client_ip(request))
    except RateLimitExceeded as e:
        raise HTTPException(429, detail=f"Too many drops created. Try again in {e.retry_after}s")

    if not files:
        raise HTTPException(400, detail="At least one file is required")

    slug = generate_slug()
    file_sizes = []
    total_size = 0

    for f in files:
        size = f.size
        if size is None:
            current_position = f.file.tell()
            f.file.seek(0, 2)
            size = f.file.tell()
            f.file.seek(current_position)

        if size > settings.max_file_size_bytes:
            raise HTTPException(413, detail=f"'{f.filename}' exceeds the {settings.max_file_size_mb}MB per-file limit")

        file_sizes.append(size)
        total_size += size

    if total_size > settings.max_drop_size_bytes:
        raise HTTPException(413, detail=f"Total drop size exceeds the {settings.max_drop_size_mb}MB limit")

    # Validate expiry settings BEFORE touching object storage.
    try:
        time_expiry_enum = TimeExpiryOption(time_expiry) if time_expiry else None
    except ValueError:
        raise HTTPException(
            400,
            detail="Invalid time_expiry. Use 1h, 1d, or 7d.",
        )

    if expiry_mode == ExpiryModeSchema.TIME and time_expiry_enum is None:
        raise HTTPException(
            400,
            detail="time_expiry is required when expiry_mode is 'time'",
        )

    if expiry_mode == ExpiryModeSchema.DOWNLOAD_COUNT:
        if max_downloads is None:
            raise HTTPException(
                400,
                detail="max_downloads is required when expiry_mode is 'download_count'",
            )

    if max_downloads is not None and not 1 <= max_downloads <= 1000:
        raise HTTPException(
            400,
            detail="max_downloads must be between 1 and 1000",
        )

    expires_at = drop_service.resolve_expires_at(time_expiry_enum)

    password_hash = hash_password(password) if password else None
    drop_type = DropType.FILE if len(files) == 1 else DropType.BATCH

    files_meta = []
    uploaded_keys = []

    try:
        for f, size in zip(files, file_sizes):
            contents_key = f"drops/{slug}/{uuid.uuid4()}"

            # boto3 is synchronous, so don't block FastAPI's event loop.
            await asyncio.to_thread(
                storage_service.upload_stream,
                contents_key,
                f.file,
                f.content_type or "application/octet-stream",
            )

            uploaded_keys.append(contents_key)

            files_meta.append(
                {
                    "original_filename": f.filename or "unnamed",
                    "content_type": f.content_type or "application/octet-stream",
                    "size_bytes": size,
                    "storage_key": contents_key,
                }
            )

        async with AsyncSessionLocal() as db:
            drop = await drop_service.create_file_drop(
                db,
                slug=slug,
                drop_type=drop_type,
                expiry_mode=ExpiryMode(expiry_mode.value),
                expires_at=expires_at,
                max_downloads=max_downloads,
                password_hash=password_hash,
                files_meta=files_meta,
            )
            drop = await drop_service.get_drop_with_files(db, drop.slug)

    except Exception:
        # DB/storage failure must not leave orphaned objects behind.
        if uploaded_keys:
            try:
                await asyncio.to_thread(
                    storage_service.delete_objects,
                    uploaded_keys,
                )
            except Exception:
                pass

        raise

    return _to_drop_out(drop, request)
    password_hash = hash_password(password) if password else None
    drop_type = DropType.FILE if len(files) == 1 else DropType.BATCH

    async with AsyncSessionLocal() as db:
        drop = await drop_service.create_file_drop(
            db,
            slug=slug,
            drop_type=drop_type,
            expiry_mode=ExpiryMode(expiry_mode.value),
            expires_at=expires_at,
            max_downloads=max_downloads,
            password_hash=password_hash,
            files_meta=files_meta,
        )
        drop = await drop_service.get_drop_with_files(db, drop.slug)

    return _to_drop_out(drop, request)


@router.get("/{slug}/meta", response_model=DropMetaOut)
async def get_drop_meta(slug: str, db: AsyncSession = Depends(get_db)):
    """
    Public-safe peek: does this drop exist, is it expired, does it need a
    password? No content returned here - lets the frontend render the
    right unlock/expired UI before the user commits to anything.
    """
    try:
        drop = await drop_service.get_drop_with_files(db, slug)
    except drop_service.DropNotFoundError:
        raise HTTPException(404, detail="Drop not found")

    return DropMetaOut(
        slug=drop.slug,
        drop_type=drop.drop_type.value,
        requires_password=drop.password_hash is not None,
        is_expired=drop.is_expired(),
        # Filenames and sizes are real content metadata, not safe to expose
        # ahead of a password check - a password-protected drop's file list
        # must stay hidden until the password has been verified server-side.
        files=(
            [DropFileOut.from_model(f) for f in drop.files]
            if drop.files and drop.password_hash is None
            else []
        ),
    )


@router.post("/{slug}/unlock/text", response_model=TextDropContentOut)
async def unlock_text_drop(
    slug: str, request: Request, payload: UnlockRequest | None = None, db: AsyncSession = Depends(get_db)
):
    try:
        await password_attempt_rate_limit(_client_ip(request), slug)
    except RateLimitExceeded as e:
        raise HTTPException(429, detail=f"Too many attempts. Try again in {e.retry_after}s")

    try:
        drop = await drop_service.get_drop_by_slug(db, slug)
    except drop_service.DropNotFoundError:
        raise HTTPException(404, detail="Drop not found")

    if drop.drop_type != DropType.TEXT:
        raise HTTPException(400, detail="Not a text drop")
    if drop.is_expired():
        raise HTTPException(410, detail="This drop has expired")

    try:
        drop_service.check_password(drop, payload.password if payload else None)
    except drop_service.DropPasswordRequiredError:
        raise HTTPException(401, detail="Password required")
    except drop_service.DropPasswordIncorrectError:
        raise HTTPException(403, detail="Incorrect password")

    if drop.expiry_mode == ExpiryMode.VIEW_ONCE:
        consumed = await drop_service.try_consume_view_once(db, drop.id)
        if not consumed:
            raise HTTPException(410, detail="This drop has already been viewed")
    elif drop.max_downloads is not None:
        consumed = await drop_service.try_consume_download(db, drop.id)
        if not consumed:
            raise HTTPException(410, detail="This drop has reached its view limit")

    return TextDropContentOut(text_content=drop.text_content, text_language=drop.text_language)


@router.post("/{slug}/unlock/files", response_model=list[DropFileOut])
async def unlock_file_drop(
    slug: str, request: Request, payload: UnlockRequest | None = None, db: AsyncSession = Depends(get_db)
):
    """
    Password-gated peek at a file drop's contents. The /meta endpoint never
    includes filenames/sizes for a password-protected drop - this endpoint
    is the only way to see them, and it requires the password up front,
    same as the text-drop unlock path. It does not consume a download
    (view-once/download-count aren't touched here); actual consumption
    still happens per-file at the download endpoint below.
    """
    try:
        await password_attempt_rate_limit(_client_ip(request), slug)
    except RateLimitExceeded as e:
        raise HTTPException(429, detail=f"Too many attempts. Try again in {e.retry_after}s")

    try:
        drop = await drop_service.get_drop_with_files(db, slug)
    except drop_service.DropNotFoundError:
        raise HTTPException(404, detail="Drop not found")

    if drop.drop_type == DropType.TEXT:
        raise HTTPException(400, detail="Not a file drop")
    if drop.is_expired():
        raise HTTPException(410, detail="This drop has expired")

    try:
        drop_service.check_password(drop, payload.password if payload else None)
    except drop_service.DropPasswordRequiredError:
        raise HTTPException(401, detail="Password required")
    except drop_service.DropPasswordIncorrectError:
        raise HTTPException(403, detail="Incorrect password")

    return [DropFileOut.from_model(f) for f in drop.files]


@router.post("/{slug}/download/{file_id}", response_model=DownloadUrlOut)
async def get_download_url(
    slug: str,
    file_id: uuid.UUID,
    request: Request,
    payload: UnlockRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        await download_rate_limit(_client_ip(request))
    except RateLimitExceeded as e:
        raise HTTPException(429, detail=f"Too many downloads. Try again in {e.retry_after}s")

    try:
        drop = await drop_service.get_drop_with_files(db, slug)
    except drop_service.DropNotFoundError:
        raise HTTPException(404, detail="Drop not found")

    if drop.is_expired():
        raise HTTPException(410, detail="This drop has expired")

    try:
        drop_service.check_password(drop, payload.password if payload else None)
    except drop_service.DropPasswordRequiredError:
        raise HTTPException(401, detail="Password required")
    except drop_service.DropPasswordIncorrectError:
        raise HTTPException(403, detail="Incorrect password")

    target_file = next((f for f in drop.files if f.id == file_id), None)
    if target_file is None:
        raise HTTPException(404, detail="File not found in this drop")

    if drop.expiry_mode == ExpiryMode.VIEW_ONCE:
        consumed = await drop_service.try_consume_view_once(db, drop.id)
        if not consumed:
            raise HTTPException(410, detail="This drop has already been viewed")
    elif drop.max_downloads is not None:
        consumed = await drop_service.try_consume_download(db, drop.id)
        if not consumed:
            raise HTTPException(410, detail="This drop has reached its download limit")

    expires_in = 60 if drop.expiry_mode == ExpiryMode.VIEW_ONCE or drop.max_downloads == 1 else 300
    url = storage_service.generate_download_url(
        target_file.storage_key,
        target_file.original_filename,
        expires_in=expires_in,
    )
    return DownloadUrlOut(
        filename=target_file.original_filename,
        url=url,
        content_type=target_file.content_type,
        size_bytes=target_file.size_bytes,
    )
