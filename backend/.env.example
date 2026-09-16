from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = "change-me-in-production"
    base_url: str = "http://localhost:3000"
    trusted_proxy_ips: str = ""

    database_url: str = "postgresql+asyncpg://dropzone:dropzone@postgres:5432/dropzone"

    redis_url: str = "redis://redis:6379/0"

    s3_endpoint_url: str = "http://minio:9000"
    s3_public_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "dropzone"
    s3_secret_key: str = "dropzone123"
    s3_bucket: str = "dropzone-drops"
    s3_region: str = "us-east-1"
    s3_use_ssl: bool = False

    rate_limit_uploads_per_hour: int = 20
    rate_limit_downloads_per_minute: int = 30
    rate_limit_password_attempts_per_minute: int = 5

    max_file_size_mb: int = 500
    max_drop_size_mb: int = 1000

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