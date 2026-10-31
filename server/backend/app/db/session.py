from collections.abc import Iterator
from contextlib import contextmanager

import psycopg

from app.core.config import settings


class DatabaseNotConfiguredError(RuntimeError):
    """Raised when the backend has no PostgreSQL connection string."""


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    if not settings.database_url:
        raise DatabaseNotConfiguredError(
            "SUPABASE_DATABASE_URL or DATABASE_URL is not configured."
        )
    with psycopg.connect(settings.database_url) as connection:
        yield connection


def check_connection() -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()