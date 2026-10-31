from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class GitHubRepository(BaseModel):
    name: str
    full_name: str
    default_branch: str
    html_url: str
    description: str | None = None
    language: str | None = None
    private: bool = False
    updated_at: datetime | None = None


class GitHubRepositoryList(BaseModel):
    username: str
    repositories: list[GitHubRepository]


class InventoryEntry(BaseModel):
    relative_path: str
    extension: str
    size: int
    category: Literal["source", "documentation", "configuration", "binary", "generated"]
    language: str | None = None


class Project(BaseModel):
    id: str
    name: str
    source_type: Literal["github", "upload"]
    source_reference: str | None = None
    path: str
    evidence_files: list[str] = Field(default_factory=list)
    created_at: datetime
    ingestion_status: Literal["complete"] = "complete"
    file_count: int = 0
    total_size: int = 0
    languages: list[str] = Field(default_factory=list)
    inventory: list[InventoryEntry] = Field(default_factory=list)
    repository_url: str | None = None
    owner: str | None = None
    repository_name: str | None = None
    branch: str | None = None
    commit_hash: str | None = None
    commit_timestamp: datetime | None = None
    storage_objects: list[str] = Field(default_factory=list)


class ProjectList(BaseModel):
    projects: list[Project] = Field(default_factory=list)


class ProjectSourceFile(BaseModel):
    relative_path: str
    category: Literal["source", "documentation", "configuration", "binary", "generated"]
    size: int
    language: str | None = None
    content: str | None = None
    readable: bool = True


class ProjectSource(BaseModel):
    project_id: str
    source_type: Literal["github", "upload"]
    source_reference: str | None = None
    repository_url: str | None = None
    files: list[ProjectSourceFile] = Field(default_factory=list)


class GitHubImportRequest(BaseModel):
    project_name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=1, max_length=39)
    repository: str = Field(min_length=1, max_length=100)
    branch: str | None = Field(default=None, max_length=255)
