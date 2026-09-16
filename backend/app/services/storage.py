import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import settings


class StorageService:
    """
    Thin wrapper around boto3's S3 client, pointed at MinIO locally and at
    real S3/R2 in production — same code, different endpoint. Files are
    never made public; every download goes through a short-lived signed URL
    generated on demand, so a leaked/guessed storage key alone is useless.
    """

    def __init__(self) -> None:
        # Internal client: talks to MinIO over the Docker network, used for
        # every actual read/write/delete operation.
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            use_ssl=settings.s3_use_ssl,
            config=BotoConfig(signature_version="s3v4"),
        )
        # Public client: identical credentials, but points at an endpoint the
        # browser can actually resolve. Used ONLY to generate signed URLs —
        # the browser fetches the file directly from this address, so it
        # can't be the internal Docker hostname ("minio"), which means
        # nothing outside the Docker network.
        self._public_client = boto3.client(
            "s3",
            endpoint_url=settings.s3_public_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            use_ssl=settings.s3_use_ssl,
            config=BotoConfig(signature_version="s3v4"),
        )
        self.bucket = settings.s3_bucket

    def ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self._client.create_bucket(Bucket=self.bucket)

    def upload_stream(self, key: str, file_obj, content_type: str) -> None:
        """
        Streams the upload directly to object storage. boto3's upload_fileobj
        reads the source in chunks internally rather than loading the whole
        file into memory — this is what makes large files safe to accept.
        """
        self._client.upload_fileobj(
            file_obj,
            self.bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )

    def generate_download_url(self, key: str, filename: str, expires_in: int = 300) -> str:
        """
        Signed, time-limited download link. expires_in defaults to 5 minutes —
        long enough for a browser to start the download, short enough that
        the link is useless if it leaks or gets cached somewhere.

        Generated using the PUBLIC client so the resulting URL points at an
        address the browser can resolve, not the internal Docker hostname.
        """
        return self._public_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=expires_in,
        )

    def delete_object(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError:
            pass  # already gone — fine, expiry sweep should be idempotent

    def delete_objects(self, keys: list[str]) -> None:
        if not keys:
            return
        self._client.delete_objects(
            Bucket=self.bucket,
            Delete={"Objects": [{"Key": k} for k in keys]},
        )


storage_service = StorageService()