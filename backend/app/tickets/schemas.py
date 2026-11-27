"""Boundary types for the accepted incident contract, independent of ORM models."""

from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

_TRIM = (
    "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004"
    "\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
)


def _trim(value: object) -> object:
    if not isinstance(value, str):
        return value
    if "\x00" in value:
        raise ValueError("Incident text contains an unsupported character.")
    value.encode("utf-8")
    return value.strip(_TRIM)


class IncidentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    summary: Annotated[str, Field(min_length=1, max_length=120), BeforeValidator(_trim)]
    description: Annotated[str, Field(min_length=1, max_length=4000), BeforeValidator(_trim)]
    prompt_review: bool = False


class IncidentTriage(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    impact: Literal["low", "medium", "high"]
    urgency: Literal["low", "medium", "high"]
