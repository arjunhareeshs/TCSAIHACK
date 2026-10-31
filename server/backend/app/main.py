from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router
from app.core.config import settings
from app.db.session import DatabaseNotConfiguredError, check_connection


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.projects_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(
        {settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"}
    ),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-GitHub-Token"],
)
app.include_router(router, prefix=settings.api_prefix)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db", tags=["system"])
async def database_health() -> dict[str, str]:
    try:
        check_connection()
    except DatabaseNotConfiguredError:
        return {"status": "not_configured"}
    except Exception:
        return {"status": "unavailable"}
    return {"status": "ok"}
