from collections.abc import Mapping
from http import HTTPStatus

from fastapi import Request
from pydantic import BaseModel
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: str


def error_response(
    request: Request,
    status: int,
    code: str,
    message: str,
    *,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(code=code, message=message, request_id=request.state.request_id)
    return JSONResponse(body.model_dump(), status_code=status, headers=headers)


async def http_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, HTTPException)
    try:
        status = HTTPStatus(exc.status_code)
    except ValueError:
        return error_response(
            request, exc.status_code, "http_error", "Request failed.", headers=exc.headers
        )
    return error_response(request, status, status.name.lower(), status.phrase, headers=exc.headers)


async def validation_error(request: Request, _exc: Exception) -> JSONResponse:
    return error_response(request, 422, "invalid_request", "Request validation failed.")
