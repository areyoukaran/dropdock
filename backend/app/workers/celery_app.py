from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "dropzone",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.expiry"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Sweep for expired drops every 5 minutes. This is the "background expiry
# job" from the spec: drops are deleted by a scheduled worker walking the
# table, not at request time - a request that happens to land on an
# already-expired drop should just get a 410, not trigger cleanup work
# inline on someone else's request path.
celery_app.conf.beat_schedule = {
    "sweep-expired-drops": {
        "task": "app.workers.expiry.sweep_expired_drops",
        "schedule": crontab(minute="*/5"),
    },
}
