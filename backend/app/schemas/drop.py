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
    text_content: str = Field(..., min_length=1, max_length=500_000)
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

    class Config:
        from_attributes = True

    @classmethod
    def from_model(cls, file):
        return cls(
            id=str(file.id),
            original_filename=file.original_filename,
            content_type=file.content_type,
            size_bytes=file.size_bytes,
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


class DropMetaOut(BaseModel):
    """Public-safe metadata shown before unlocking/downloading — no content."""

    slug: str
    drop_type: str
    requires_password: bool
    is_expired: bool
    files: list[DropFileOut] = []