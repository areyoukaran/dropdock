from datetime import datetime, timedelta, timezone

from app.models.drop import Drop, DropType, ExpiryMode


def test_time_expiry_uses_utc_timezone_aware_compare():
    drop = Drop(
        slug="abc12345",
        drop_type=DropType.TEXT,
        expiry_mode=ExpiryMode.TIME,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    assert drop.is_expired() is True


def test_future_time_expiry_is_not_expired():
    drop = Drop(
        slug="def67890",
        drop_type=DropType.TEXT,
        expiry_mode=ExpiryMode.TIME,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )

    assert drop.is_expired() is False


def test_naive_datetime_expiry_is_treated_as_utc():
    drop = Drop(
        slug="ghi90123",
        drop_type=DropType.TEXT,
        expiry_mode=ExpiryMode.TIME,
        expires_at=datetime.now() - timedelta(minutes=1),
    )

    assert drop.is_expired() is True


def test_time_and_download_expiry_use_whichever_limit_is_reached_first():
    drop = Drop(
        slug="jkl23456",
        drop_type=DropType.TEXT,
        expiry_mode=ExpiryMode.TIME,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        max_downloads=2,
        download_count=2,
    )

    assert drop.is_expired() is True


def test_view_once_ignores_time_and_download_limits():
    drop = Drop(
        slug="mno56789",
        drop_type=DropType.TEXT,
        expiry_mode=ExpiryMode.VIEW_ONCE,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        max_downloads=1,
        download_count=1,
        consumed=False,
    )

    assert drop.is_expired() is False
