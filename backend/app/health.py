import asyncio
from collections.abc import Awaitable, Callable
from typing import Any, Literal, cast

from fastapi import APIRouter, Request
from pydantic import BaseModel
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.responses import JSONResponse

from app.core.errors import ErrorResponse, error_response
from app.core.telemetry import logger

router = APIRouter(prefix="/api/health", tags=["Health"])
unavailable: dict[int | str, dict[str, Any]] = {
    503: {"model": ErrorResponse, "description": "Required dependency unavailable"}
}


class HealthStatus(BaseModel):
    status: Literal["ok"] = "ok"


async def postgres_ping(engine: AsyncEngine) -> bool:
    async with engine.connect() as connection:
        result: object = await connection.scalar(text("SELECT 1"))
        return result == 1


async def redis_ping(client: Redis) -> bool:
    return await cast("Awaitable[object]", client.ping()) is True


async def probe(
    request: Request,
    dependency: str,
    ping: Callable[[], Awaitable[bool]],
) -> HealthStatus | JSONResponse:
    error_class = "UnexpectedResponse"
    try:
        async with asyncio.timeout(request.app.state.probe_timeout_seconds):
            if await ping():
                return HealthStatus()
    except (TimeoutError, OSError, SQLAlchemyError, RedisError) as exc:
        error_class = type(exc).__name__
    logger.warning(
        "dependency_unavailable",
        extra={
            "request_id": request.state.request_id,
            "dependency": dependency,
            "outcome": "unavailable",
            "error_class": error_class,
        },
    )
    return error_response(request, 503, "unavailable", "A required dependency is unavailable.")


@router.get("/live", summary="Check API process liveness")
async def live() -> HealthStatus:
    return HealthStatus()


@router.get("/ready", response_model=HealthStatus, responses=unavailable)
async def ready(request: Request) -> HealthStatus | JSONResponse:
    return await probe(request, "postgres", lambda: postgres_ping(request.app.state.engine))


@router.get("/redis", response_model=HealthStatus, responses=unavailable)
async def redis(request: Request) -> HealthStatus | JSONResponse:
    return await probe(request, "redis", lambda: redis_ping(request.app.state.redis))


async def auth_health(request: Request) -> HealthStatus | JSONResponse:
    return await probe(request, "auth_limiter", request.app.state.auth_limiter.healthy)
