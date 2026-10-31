from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.schemas.projects import (
    InventoryEntry,
    Project,
    ProjectList,
    ProjectSource,
    ProjectUpdate,
)
from app.services.project_service import ProjectService, ProjectServiceError

router = APIRouter()
service = ProjectService()


def _error(error: ProjectServiceError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=str(error))


@router.get("", response_model=ProjectList)
async def list_projects() -> ProjectList:
    try:
        return service.list_projects()
    except ProjectServiceError as error:
        raise _error(error) from error


@router.post("/upload", response_model=Project, status_code=201)
async def upload_evidence(
    project_name: str = Form(..., min_length=1, max_length=100),
    files: list[UploadFile] = File(...),
) -> Project:
    try:
        contents = [(file.filename or "", await file.read()) for file in files]
        return await service.create_upload(project_name, contents)
    except ProjectServiceError as error:
        raise _error(error) from error


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    try:
        return service.get_project(project_id)
    except ProjectServiceError as error:
        raise _error(error) from error


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, update: ProjectUpdate) -> Project:
    try:
        return service.update_project(project_id, update.name)
    except ProjectServiceError as error:
        raise _error(error) from error


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str) -> Response:
    try:
        service.delete_project(project_id)
        return Response(status_code=204)
    except ProjectServiceError as error:
        raise _error(error) from error


@router.get("/{project_id}/inventory", response_model=list[InventoryEntry])
async def get_inventory(project_id: str) -> list[InventoryEntry]:
    try:
        return service.get_inventory(project_id)
    except ProjectServiceError as error:
        raise _error(error) from error


@router.get("/{project_id}/source", response_model=ProjectSource)
async def get_source(project_id: str) -> ProjectSource:
    try:
        return service.get_source(project_id)
    except ProjectServiceError as error:
        raise _error(error) from error
