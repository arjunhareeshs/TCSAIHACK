from fastapi import APIRouter

from app.api.v1.endpoints.github import router as github_router
from app.api.v1.endpoints.projects import router as projects_router


router = APIRouter()
router.include_router(projects_router, prefix="/projects", tags=["projects"])
router.include_router(github_router, prefix="/github", tags=["github"])