import asyncio
import logging

from app.core.config import settings
from app.workers.expiry import _sweep

logger = logging.getLogger("dropdock.background_loop")


async def run_periodic_sweep() -> None:
    """
    In-process equivalent of Celery Beat's scheduled sweep, for
    deployments (e.g. Render's free tier) where running a separate
    worker + beat process isn't free.

    This does NOT affect correctness of expiry enforcement — is_expired()
    is checked live on every request that touches a drop, so an expired
    drop is never served whether or not this loop has run recently. This
    loop only does the *cleanup* half: deleting expired drops' files from
    object storage and marking their rows deleted, so storage doesn't
    accumulate indefinitely.

    Runs for as long as the FastAPI process is alive. On a sleeping free
    tier instance, this pauses along with everything else and simply
    resumes on the next request that wakes the service — acceptable for
    a low-traffic deployment; not a substitute for a real scheduler under
    sustained load.
    """
    interval = settings.background_sweep_interval_seconds
    while True:
        try:
            await asyncio.sleep(interval)
            count = await _sweep()
            if count:
                logger.info("Background sweep removed %d expired drop(s)", count)
        except asyncio.CancelledError:
            raise
        except Exception:
            # A single failed sweep (e.g. transient DB hiccup) should never
            # kill the loop — log and try again next interval.
            logger.exception("Background expiry sweep failed; will retry next interval")