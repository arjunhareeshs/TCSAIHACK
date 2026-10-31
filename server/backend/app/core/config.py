from pathlib import Path
import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "Legacy Modernization API"
    api_prefix: str = "/api/v1"
    projects_dir: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parents[2] / "Projects"
    )
    github_api_url: str = "https://api.github.com"
    max_upload_size_bytes: int = 25 * 1024 * 1024
    max_archive_files: int = 10_000
    max_archive_uncompressed_bytes: int = 100 * 1024 * 1024
    github_token: str | None = Field(default_factory=lambda: os.getenv("GITHUB_TOKEN"))
    supabase_url: str | None = Field(default_factory=lambda: os.getenv("SUPABASE_URL"))
    supabase_service_role_key: str | None = Field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    source_bucket: str = "legacy-source-code"
    evidence_bucket: str = "legacy-evidence"
    frontend_origin: str = Field(
        default_factory=lambda: os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    )


settings = Settings()