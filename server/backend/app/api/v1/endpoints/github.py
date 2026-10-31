from fastapi import APIRouter, Header, HTTPException

from app.schemas.projects import GitHubRepositoryList, GitHubImportRequest, Project
from app.services.project_service import ProjectService, ProjectServiceError

router = APIRouter()
service = ProjectService()


def _error(error: ProjectServiceError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=str(error))


@router.get("/{username}/repositories", response_model=GitHubRepositoryList)
async def repositories(
    username: str, x_github_token: str | None = Header(default=None)
) -> GitHubRepositoryList:
    try:
        return await service.github_repositories(username, x_github_token)
    except ProjectServiceError as error:
        raise _error(error) from error


@router.post("/clone", response_model=Project, status_code=201)
async def clone(
    request: GitHubImportRequest,
    x_github_token: str | None = Header(default=None),
) -> Project:
    try:
        return await service.import_github(request, x_github_token)
    except ProjectServiceError as error:
        raise _error(error) from error
