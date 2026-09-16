import time

import redis.asyncio as redis

from app.core.config import settings

_redis: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


class RateLimitExceeded(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded, retry after {retry_after}s")


async def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> None:
    """
    Fixed-window counter per key (e.g. 'upload:{ip}' or 'download:{ip}').
    Uses a Redis INCR + EXPIRE pair: the first request in a window sets the
    expiry, subsequent ones just increment. Cheap, atomic enough for this
    use case, and self-cleaning — no separate sweep needed for rate-limit
    keys since Redis expires them itself.
    """
    r = get_redis()
    now_bucket = int(time.time() // window_seconds)
    redis_key = f"ratelimit:{key}:{now_bucket}"

    count = await r.incr(redis_key)
    if count == 1:
        await r.expire(redis_key, window_seconds)

    if count > max_requests:
        ttl = await r.ttl(redis_key)
        raise RateLimitExceeded(retry_after=max(ttl, 1))


async def upload_rate_limit(client_ip: str) -> None:
    await check_rate_limit(
        f"upload:{client_ip}",
        max_requests=settings.rate_limit_uploads_per_hour,
        window_seconds=3600,
    )


async def download_rate_limit(client_ip: str) -> None:
    await check_rate_limit(
        f"download:{client_ip}",
        max_requests=settings.rate_limit_downloads_per_minute,
        window_seconds=60,
    )


async def password_attempt_rate_limit(client_ip: str, slug: str) -> None:
    """
    Deliberately tight: password-unlock attempts (text or files) are a
    brute-force target in a way plain downloads aren't, since a wrong
    guess costs the attacker nothing but a request. Keyed per IP *and*
    per slug so repeated wrong guesses on one drop don't lock a client
    out of unlocking a different drop.
    """
    await check_rate_limit(
        f"unlock:{client_ip}:{slug}",
        max_requests=settings.rate_limit_password_attempts_per_minute,
        window_seconds=60,
    )
