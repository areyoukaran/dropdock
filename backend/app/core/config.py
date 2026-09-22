from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = "change-me-in-production"
    base_url: str = "http://localhost:3000"
    trusted_proxy_ips: str = ""

    database_url: str = "postgresql+asyncpg://dropdock:dropdock@postgres:5432/dropdock"

    redis_url: str = "redis://redis:6379/0"

    s3_endpoint_url: str = "http://minio:9000"
    s3_public_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "dropdock"
    s3_secret_key: str = "dropdock123"
    s3_bucket: str = "dropdock-drops"
    s3_region: str = "us-east-1"
    s3_use_ssl: bool = False

    rate_limit_uploads_per_hour: int = 20
    rate_limit_downloads_per_minute: int = 30
    rate_limit_password_attempts_per_minute: int = 5

    max_file_size_mb: int = 500
    max_drop_size_mb: int = 1000

    # Comma-separated list of origins the frontend is served from.
    # Defaults to local dev ports; must include the real deployed frontend
    # URL (e.g. https://dropdock.vercel.app) once deployed, or the browser
    # will block every request with a CORS error.
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    # In-process expiry sweep - used instead of Celery Beat when no separate
    # worker/beat process is available (e.g. Render's free tier). Ignored
    # entirely if enable_background_sweep is False, which is the local dev
    # default since docker-compose already runs a real Celery beat there -
    # running both would sweep twice, harmlessly but redundantly.
    enable_background_sweep: bool = False
    background_sweep_interval_seconds: int = 300

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def max_drop_size_bytes(self) -> int:
        return self.max_drop_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()