from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ExpiryModeSchema(str, Enum):
    TIME = "time"
    DOWNLOAD_COUNT = "download_count"
    VIEW_ONCE = "view_once"


class TimeExpiryOption(str, Enum):
    ONE_HOUR = "1h"
    ONE_DAY = "1d"
    SEVEN_DAYS = "7d"


class CreateTextDropRequest(BaseModel):
    text_content: str = Field(..., min_length=1, max_length=250_000)
    text_language: str | None = None
    expiry_mode: ExpiryModeSchema
    time_expiry: TimeExpiryOption | None = None
    max_downloads: int | None = Field(None, ge=1, le=1000)
    password: str | None = Field(None, min_length=4, max_length=128)


class DropFileOut(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    # True once this specific file can no longer be opened: a spent
    # VIEW_ONCE reveal, or (for DOWNLOAD_COUNT drops) a file that has used
    # up its own download allowance. Lets the frontend show "Viewed" /
    # "Downloaded" for files already exhausted by someone else, instead of
    # a live button that would just 410 on click.
    consumed: bool = False

    class Config:
        from_attributes = True

    @classmethod
    def from_model(cls, file, max_downloads: int | None = None):
        exhausted = file.consumed or (
            max_downloads is not None and file.download_count >= max_downloads
        )
        return cls(
            id=str(file.id),
            original_filename=file.original_filename,
            content_type=file.content_type,
            size_bytes=file.size_bytes,
            consumed=exhausted,
        )


class DropOut(BaseModel):
    slug: str
    drop_type: str
    expiry_mode: str
    expires_at: datetime | None
    max_downloads: int | None
    download_count: int
    has_password: bool
    created_at: datetime
    files: list[DropFileOut] = []
    share_url: str

    class Config:
        from_attributes = True


class TextDropContentOut(BaseModel):
    text_content: str
    text_language: str | None


class UnlockRequest(BaseModel):
    password: str | None = None


class DownloadUrlOut(BaseModel):
    filename: str
    url: str
    content_type: str
    size_bytes: int
    # "inline" -> `url` renders in place (view-once preview);
    # "attachment" -> `url` is a normal download / Save As.
    disposition: str = "attachment"
    # Populated only for view-once previewable files: a second signed URL
    # to the same object, forced to download, so the one-time reveal can
    # be both looked at and saved without a second (already-consumed)
    # unlock request.
    download_url: str | None = None


class ArchiveDownloadUrlOut(BaseModel):
    filename: str
    url: str
    content_type: str = "application/zip"
    disposition: str = "attachment"


class DropMetaOut(BaseModel):
    """Public-safe metadata shown before unlocking/downloading - no content."""

    slug: str
    drop_type: str
    expiry_mode: str
    max_downloads: int | None = None
    requires_password: bool
    is_expired: bool
    files: list[DropFileOut] = []