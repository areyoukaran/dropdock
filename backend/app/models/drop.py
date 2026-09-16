import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DropType(str, enum.Enum):
    FILE = "file"
    BATCH = "batch"
    TEXT = "text"
    IMAGE = "image"


class ExpiryMode(str, enum.Enum):
    TIME = "time"
    DOWNLOAD_COUNT = "download_count"
    VIEW_ONCE = "view_once"


class Drop(Base):
    """
    The core polymorphic entity. A Drop represents ANY shareable content —
    a single file, a batch of files, a text snippet, or a pasted image.
    Expiry and access-control logic is written once here and applies to
    all four content types identically, instead of four separate models
    each re-implementing the same rules.
    """

    __tablename__ = "drops"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Short, URL-safe slug used in the shareable link (e.g. /d/x7Kp9q)
    slug: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)

    drop_type: Mapped[DropType] = mapped_column(Enum(DropType), nullable=False)

    # --- Content (exactly one of these is populated, depending on drop_type) ---
    # Text/code snippets are small enough to store directly in Postgres.
    text_content: Mapped[str | None] = mapped_column(String, nullable=True)
    text_language: Mapped[str | None] = mapped_column(String(32), nullable=True)  # for syntax highlighting

    # Files and images live in object storage; only metadata lives here.
    # For BATCH drops, individual files are rows in the DropFile table instead.

    # --- Expiry rules ---
    expiry_mode: Mapped[ExpiryMode] = mapped_column(Enum(ExpiryMode), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_downloads: Mapped[int | None] = mapped_column(Integer, nullable=True)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # view_once text is marked consumed after first render, never gets a raw link
    consumed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # --- Access control ---
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)

    # --- Lifecycle ---
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- Optional ownership (anonymous by default; set if creator was logged in) ---
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    files: Mapped[list["DropFile"]] = relationship(
        "DropFile", back_populates="drop", cascade="all, delete-orphan"
    )

    def is_expired(self) -> bool:
        if self.is_deleted:
            return True

        if self.expiry_mode == ExpiryMode.VIEW_ONCE:
            return self.consumed

        time_expired = False
        if self.expires_at is not None:
            expires_at = self.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            time_expired = datetime.now(timezone.utc) >= expires_at.astimezone(timezone.utc)

        if time_expired:
            return True

        if self.max_downloads is not None:
            return self.download_count >= self.max_downloads

        return False