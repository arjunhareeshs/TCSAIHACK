import io
import re
import shutil
import tarfile
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.schemas.projects import (
    GitHubImportRequest,
    GitHubRepository,
    GitHubRepositoryList,
    InventoryEntry,
    Project,
    ProjectList,
    ProjectSource,
    ProjectSourceFile,
)
from app.services.inventory_service import build_inventory

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")
_ALLOWED_UPLOAD_EXTENSIONS = {
    ".py", ".java", ".js", ".jsx", ".ts", ".tsx", ".c", ".h", ".cpp", ".cc",
    ".cs", ".cob", ".cbl", ".php", ".rb", ".go", ".sql", ".sh", ".bash",
    ".html", ".htm", ".css", ".md", ".rst", ".txt", ".adoc", ".json", ".xml",
    ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".properties",
    ".env", ".gradle", ".dockerfile", ".zip",
}
_MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024
_MAX_SOURCE_PREVIEW_BYTES = 512 * 1024
_TEXT_EXTENSIONS = _ALLOWED_UPLOAD_EXTENSIONS - {".zip", ".pdf", ".doc", ".docx"}


class ProjectServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _safe_name(value: str, fallback: str) -> str:
    cleaned = _SAFE_NAME.sub("-", value).strip(".-")
    return cleaned[:100] or fallback


def _safe_relative_path(filename: str) -> PurePosixPath:
    normalized = filename.replace("\\", "/")
    path = PurePosixPath(normalized)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise ProjectServiceError("Uploaded paths must stay inside the project.")
    return path


def _manifest(project_dir: Path) -> Project:
    try:
        return Project.model_validate_json(
            (project_dir / "metadata.json").read_text(encoding="utf-8")
        )
    except (OSError, ValueError) as exc:
        raise ProjectServiceError("Project metadata is invalid.", 500) from exc


class ProjectService:
    async def github_repositories(
        self, username: str, token: str | None = None
    ) -> GitHubRepositoryList:
        username = username.strip()
        if not re.fullmatch(r"[A-Za-z0-9-]{1,39}", username):
            raise ProjectServiceError("GitHub username is invalid.")
        headers = {"Accept": "application/vnd.github+json"}
        auth_token = token or settings.github_token
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{settings.github_api_url}/users/{quote(username)}/repos",
                    params={"per_page": "100", "sort": "updated"},
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise ProjectServiceError("GitHub could not be reached.", 502) from exc
        if response.status_code == 404:
            raise ProjectServiceError("GitHub user was not found.", 404)
        if response.status_code == 403:
            raise ProjectServiceError("GitHub API rate limit exceeded.", 429)
        if response.is_error:
            raise ProjectServiceError("GitHub repository lookup failed.", 502)
        return GitHubRepositoryList(
            username=username,
            repositories=[
                GitHubRepository(
                    name=item["name"],
                    full_name=item["full_name"],
                    default_branch=item.get("default_branch") or "main",
                    html_url=item["html_url"],
                    description=item.get("description"),
                    language=item.get("language"),
                    private=item.get("private", False),
                    updated_at=item.get("updated_at"),
                )
                for item in response.json()
            ],
        )

    async def import_github(
        self, request: GitHubImportRequest, token: str | None = None
    ) -> Project:
        repository = await self._github_repository(request.username, request.repository, token)
        branch = request.branch or repository.default_branch
        headers = {"Accept": "application/vnd.github+json"}
        auth_token = token or settings.github_token
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                archive_response = await client.get(
                    f"{settings.github_api_url}/repos/{quote(request.username)}/"
                    f"{quote(request.repository)}/tarball/{quote(branch)}",
                    headers=headers,
                )
                commit_response = await client.get(
                    f"{settings.github_api_url}/repos/{quote(request.username)}/"
                    f"{quote(request.repository)}/commits/{quote(branch)}",
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise ProjectServiceError("GitHub could not be reached.", 502) from exc
        if archive_response.status_code == 404 or commit_response.status_code == 404:
            raise ProjectServiceError("Repository or branch was not found.", 404)
        if archive_response.is_error or commit_response.is_error:
            raise ProjectServiceError("GitHub repository download failed.", 502)
        commit = commit_response.json()
        project_id = str(uuid.uuid4())
        project_dir = settings.projects_dir / project_id
        source_dir = project_dir / "source"
        try:
            project_dir.mkdir(parents=True, exist_ok=False)
            source_dir.mkdir()
            self._extract_tar(archive_response.content, source_dir)
            return self._finalize(
                project_id, request.project_name, "github", project_dir, source_dir,
                source_reference=repository.html_url,
                repository_url=repository.html_url, owner=request.username,
                repository_name=request.repository, branch=branch,
                commit_hash=commit["sha"],
                commit_timestamp=commit.get("commit", {}).get("committer", {}).get("date"),
            )
        except Exception:
            shutil.rmtree(project_dir, ignore_errors=True)
            raise

    async def _github_repository(
        self, username: str, repository: str, token: str | None
    ) -> GitHubRepository:
        result = await self.github_repositories(username, token)
        for item in result.repositories:
            if item.name == repository:
                return item
        raise ProjectServiceError("Repository was not found for this user.", 404)

    async def create_upload(
        self, project_name: str, files: list[tuple[str, bytes]]
    ) -> Project:
        if not files:
            raise ProjectServiceError("At least one evidence file is required.")
        if any(not content for _, content in files):
            raise ProjectServiceError("Empty files are not allowed.")
        if any(len(content) > _MAX_SINGLE_FILE_BYTES for _, content in files):
            raise ProjectServiceError("A file exceeds the 10 MB limit.", 413)
        if sum(len(content) for _, content in files) > settings.max_upload_size_bytes:
            raise ProjectServiceError("Uploaded evidence exceeds the size limit.", 413)
        project_id = str(uuid.uuid4())
        project_dir = settings.projects_dir / project_id
        try:
            source_dir, documentation_dir = project_dir / "source", project_dir / "documentation"
            source_dir.mkdir(parents=True, exist_ok=False)
            documentation_dir.mkdir()
            for filename, content in files:
                relative = _safe_relative_path(filename)
                extension = relative.suffix.lower()
                if extension not in _ALLOWED_UPLOAD_EXTENSIONS:
                    raise ProjectServiceError(f"Unsupported file type: {extension or 'unknown'}.")
                if extension == ".zip":
                    self._extract_zip(content, source_dir)
                    continue
                destination_root = documentation_dir if extension in {".md", ".rst", ".txt", ".adoc"} else source_dir
                target = destination_root / Path(*relative.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.exists():
                    target = target.with_name(f"{uuid.uuid4().hex[:8]}-{target.name}")
                target.write_bytes(content)
            return self._finalize(project_id, project_name, "upload", project_dir, project_dir)
        except Exception:
            shutil.rmtree(project_dir, ignore_errors=True)
            raise

    def list_projects(self) -> ProjectList:
        settings.projects_dir.mkdir(parents=True, exist_ok=True)
        return ProjectList(
            projects=[
                _manifest(path)
                for path in sorted(settings.projects_dir.iterdir())
                if path.is_dir() and (path / "metadata.json").is_file()
            ]
        )

    def get_project(self, project_id: str) -> Project:
        project_dir = self._project_dir(project_id)
        return _manifest(project_dir)

    def get_inventory(self, project_id: str) -> list[InventoryEntry]:
        return self.get_project(project_id).inventory

    def get_source(self, project_id: str) -> ProjectSource:
        project = self.get_project(project_id)
        project_dir = self._project_dir(project_id)
        files = []
        for entry in project.inventory:
            file_path = project_dir / Path(*entry.relative_path.split("/"))
            content = None
            readable = entry.extension in _TEXT_EXTENSIONS
            if readable and entry.size <= _MAX_SOURCE_PREVIEW_BYTES:
                try:
                    content = file_path.read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    readable = False
            elif readable:
                readable = False
            files.append(
                ProjectSourceFile(
                    relative_path=entry.relative_path,
                    category=entry.category,
                    size=entry.size,
                    language=entry.language,
                    content=content,
                    readable=readable,
                )
            )
        return ProjectSource(
            project_id=project.id,
            source_type=project.source_type,
            source_reference=project.source_reference,
            repository_url=project.repository_url,
            files=files,
        )

    def _project_dir(self, project_id: str) -> Path:
        if not re.fullmatch(r"[0-9a-f-]{36}", project_id):
            raise ProjectServiceError("Project ID is invalid.")
        directory = (settings.projects_dir / project_id).resolve()
        if directory.parent != settings.projects_dir.resolve() or not directory.is_dir():
            raise ProjectServiceError("Project was not found.", 404)
        return directory

    @staticmethod
    def _extract_zip(content: bytes, destination: Path) -> None:
        try:
            archive = zipfile.ZipFile(io.BytesIO(content))
            members = archive.infolist()
        except zipfile.BadZipFile as exc:
            raise ProjectServiceError("Invalid ZIP archive.") from exc
        if len(members) > settings.max_archive_files:
            raise ProjectServiceError("ZIP archive contains too many files.", 413)
        total = 0
        for member in members:
            relative = _safe_relative_path(member.filename)
            total += member.file_size
            if total > settings.max_archive_uncompressed_bytes:
                raise ProjectServiceError("ZIP archive is too large when extracted.", 413)
            target = destination / Path(*relative.parts)
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            if target.exists():
                target = target.with_name(f"{uuid.uuid4().hex[:8]}-{target.name}")
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)

    @staticmethod
    def _extract_tar(content: bytes, destination: Path) -> None:
        with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as archive:
            for member in archive.getmembers():
                relative = _safe_relative_path(member.name.split("/", 1)[-1])
                target = destination / Path(*relative.parts)
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                elif member.isfile():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with archive.extractfile(member) as source, target.open("wb") as output:
                        shutil.copyfileobj(source, output)

    def _finalize(
        self, project_id: str, name: str, source_type: str, project_dir: Path,
        inventory_root: Path, source_reference: str | None = None, **repository: str | None
    ) -> Project:
        inventory = build_inventory(inventory_root)
        project = Project(
            id=project_id, name=_safe_name(name, "legacy-project"),
            source_type=source_type, source_reference=source_reference,
            path=str(project_dir.resolve()), evidence_files=[
                entry.relative_path for entry in inventory
            ], created_at=datetime.now(timezone.utc), file_count=len(inventory),
            total_size=sum(entry.size for entry in inventory),
            languages=sorted({entry.language for entry in inventory if entry.language}),
            inventory=inventory, **repository,
        )
        (project_dir / "metadata.json").write_text(
            project.model_dump_json(indent=2), encoding="utf-8"
        )
        return project
