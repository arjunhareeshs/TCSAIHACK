import logging
from pathlib import Path
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.schemas.projects import InventoryEntry, Project

logger = logging.getLogger(__name__)


class StorageService:
    async def mirror_project(
        self, project: Project, project_dir: Path
    ) -> Project:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            return project

        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/octet-stream",
            "x-upsert": "true",
        }
        objects = []
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                for entry in project.inventory:
                    local_path = project_dir / Path(*entry.relative_path.split("/"))
                    if not local_path.is_file():
                        continue
                    bucket = (
                        settings.evidence_bucket
                        if entry.category == "documentation"
                        else settings.source_bucket
                    )
                    object_path = f"{project.id}/{entry.relative_path}"
                    url = (
                        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
                        f"{quote(bucket, safe='')}/{quote(object_path, safe='/')}"
                    )
                    response = await client.post(
                        url,
                        content=local_path.read_bytes(),
                        headers=headers,
                    )
                    response.raise_for_status()
                    objects.append(f"{bucket}/{object_path}")
        except (OSError, httpx.HTTPError) as exc:
            logger.exception("Supabase project storage mirroring failed")
            raise RuntimeError("Project storage mirroring failed.") from exc

        project.storage_objects = objects
        (project_dir / "metadata.json").write_text(
            project.model_dump_json(indent=2), encoding="utf-8"
        )
        return project
