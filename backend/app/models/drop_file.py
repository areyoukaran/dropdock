import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DropFile(Base):
    """
    One physical file belonging to a Drop. A single-file drop has exactly
    one row here; a batch drop has many. This is what lets one Drop model
    represent both cases without duplicating expiry/access logic.
    """

    __tablename__ = "drop_files"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    drop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drops.id", ondelete="CASCADE"), nullable=False, index=True
    )

    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Path/key inside the object storage bucket. Never exposed directly -
    # downloads always go through a freshly generated signed URL.
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)

    # Per-file state for expiry modes that would otherwise only track at
    # the whole-Drop level. Both default to "not yet used" and are unused
    # (left at their defaults) for every expiry mode other than the one
    # they apply to.
    #
    # consumed: has this file had its one VIEW_ONCE reveal?
    # download_count: how many times has this file been downloaded, for
    #   DOWNLOAD_COUNT drops? Each file gets the drop's max_downloads as
    #   its own individual allowance, so downloading one file of a batch
    #   never uses up the allowance of the others.
    consumed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    drop: Mapped["Drop"] = relationship("Drop", back_populates="files")
