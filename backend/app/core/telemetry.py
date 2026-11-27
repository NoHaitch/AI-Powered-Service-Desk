import json
import logging
import sys
from datetime import UTC, datetime
from time import perf_counter
from uuid import uuid4

from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint

from app.core.errors import error_response

logger = logging.getLogger("service_desk")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        fields = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "service": "service-desk-api",
            "event": record.msg,
        }
        for name in (
            "request_id",
            "route",
            "status",
            "outcome",
            "duration_ms",
            "dependency",
            "error_class",
        ):
            if hasattr(record, name):
                fields[name] = getattr(record, name)
        return json.dumps(fields)


def configure_logging(level: str) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.handlers[:] = [handler]
    logger.setLevel(level)
    logger.propagate = False


async def log_request(request: Request, call_next: RequestResponseEndpoint) -> Response:
    request_id = str(uuid4())
    request.state.request_id = request_id
    started = perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(
            "request_failed",
            extra={
                "request_id": request_id,
                "outcome": "server_error",
                "error_class": type(exc).__name__,
            },
        )
        response = error_response(request, 500, "internal_error", "An unexpected error occurred.")
    response.headers["X-Request-ID"] = request_id
    if request.url.path.startswith("/api/v1/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
    outcome = "success"
    if response.status_code >= 500:
        outcome = "server_error"
    elif response.status_code >= 400:
        outcome = "client_error"
    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "route": getattr(request.scope.get("route"), "path", None),
            "status": response.status_code,
            "outcome": outcome,
            "duration_ms": round((perf_counter() - started) * 1000, 2),
        },
    )
    return response
