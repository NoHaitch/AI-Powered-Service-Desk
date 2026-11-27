from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

MIB = 1024 * 1024


class AttachmentSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DESK_ATTACHMENTS_", hide_input_in_errors=True)

    root: Path = Path("/var/lib/service-desk/attachments")
    max_file_bytes: int = Field(default=10 * MIB, ge=1, le=100 * MIB)
    max_ticket_count: int = Field(default=5, ge=1, le=100)
    max_ticket_bytes: int = Field(default=50 * MIB, ge=1)
    max_pending_count: int = Field(default=5, ge=1, le=100)
    max_pending_bytes: int = Field(default=50 * MIB, ge=1)
    max_storage_bytes: int = Field(default=2048 * MIB, ge=1)
    min_free_bytes: int = Field(default=64 * MIB, ge=0)
    staging_seconds: int = Field(default=86400, ge=1, le=604800)
    max_image_pixels: int = Field(default=16_000_000, ge=1, le=50_000_000)

    @model_validator(mode="after")
    def validate_limits(self) -> AttachmentSettings:
        if not self.root.is_absolute():
            raise ValueError("Attachment root must be absolute.")
        if self.max_file_bytes > min(self.max_ticket_bytes, self.max_pending_bytes):
            raise ValueError("Attachment file limit exceeds a ticket or pending limit.")
        if self.max_storage_bytes < max(self.max_ticket_bytes, self.max_pending_bytes):
            raise ValueError("Attachment storage limit is below a ticket or pending limit.")
        return self
