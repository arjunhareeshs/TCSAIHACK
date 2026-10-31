from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.schemas.projects import (
    InventoryEntry,
    Project,
    ProjectList,
    ProjectSource,
    ProjectUpdate,
)
from app.services.project_service import ProjectService, ProjectServiceError
from app.services.ai_service import AIServiceError, request_ai

router = APIRouter()
service = ProjectService()


class ChatRequest(BaseModel):
    message: str


class ProjectCreateRequest(BaseModel):
    name: str


def _error(error: ProjectServiceError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=str(error))


def _ai_error(error: AIServiceError) -> HTTPException:
    return HTTPException(status_code=503, detail=str(error))


@router.get("", response_model=ProjectList)
async def list_projects() -> ProjectList:
    try:
        return service.list_projects()
    except ProjectServiceError as error:
        raise _error(error) from error


@router.post("", response_model=Project, status_code=201)
async def create_project(request: ProjectCreateRequest) -> Project:
    try:
        return service.create_metadata(request.name)
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


@router.post("/{project_id}/analyze")
async def start_analysis(project_id: str) -> dict:
    try:
        service.get_project(project_id)
        return await request_ai(
            "POST",
            "/api/v1/modernize/start",
            json={"project_name": project_id},
        )
    except ProjectServiceError as error:
        raise _error(error) from error
    except AIServiceError as error:
        raise _ai_error(error) from error


@router.get("/{project_id}/status")
async def analysis_status(project_id: str) -> dict:
    try:
        service.get_project(project_id)
        return await request_ai("GET", f"/api/v1/modernize/status/{project_id}")
    except ProjectServiceError as error:
        raise _error(error) from error
    except AIServiceError as error:
        raise _ai_error(error) from error


@router.get("/{project_id}/modules")
async def analysis_modules(project_id: str) -> dict:
    try:
        service.get_project(project_id)
        return await request_ai("GET", f"/api/v1/modernize/deliverables/{project_id}")
    except ProjectServiceError as error:
        raise _error(error) from error
    except AIServiceError as error:
        raise _ai_error(error) from error


@router.get("/{project_id}/artifacts")
async def analysis_artifacts(project_id: str) -> dict:
    try:
        service.get_project(project_id)
        return await request_ai("GET", f"/api/v1/modernize/artifacts/{project_id}")
    except ProjectServiceError as error:
        raise _error(error) from error
    except AIServiceError as error:
        raise _ai_error(error) from error


@router.post("/{project_id}/chat")
async def project_chat(project_id: str, request: ChatRequest) -> dict:
    try:
        service.get_project(project_id)
        status = await request_ai("GET", f"/api/v1/modernize/status/{project_id}")
        return {
            "id": f"ai-{project_id}",
            "role": "assistant",
            "content": (
                f"AI modernization status for this project is "
                f"**{status.get('run_state', {}).get('status', 'idle')}**. "
                f"Your question was: {request.message}"
            ),
            "timestamp": "",
            "sourceReferences": [],
        }
    except ProjectServiceError as error:
        raise _error(error) from error
    except AIServiceError as error:
        raise _ai_error(error) from error
