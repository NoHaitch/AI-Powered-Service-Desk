"""Expiring Redis counters fenced by a durable PostgreSQL generation."""

from collections.abc import Awaitable
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import cast
from uuid import UUID, uuid4

from fastapi import HTTPException
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.audit.models import AuthAuditEvent
from app.core.config import Settings
from app.identity.models import AuthLimiterState
from app.identity.security import keyed

MARKER = "limiter:v1:generation"
HEALTH = "limiter:v1:recovery-probe"
COUNT = """
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return {-1, 0} end
local old = redis.call('GET', KEYS[2])
if not old then
    redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])
    return {1, tonumber(ARGV[2])}
end
local ttl = redis.call('PTTL', KEYS[2])
if ttl < 0 or not tonumber(old) or tonumber(old) < 1 then return {-1, 0} end
if tonumber(old) >= tonumber(ARGV[3]) then return {0, math.ceil(ttl / 1000)} end
return {redis.call('INCR', KEYS[2]), math.ceil(ttl / 1000)}
"""


@dataclass(frozen=True)
class Admission:
    limiter: Limiter
    generation: UUID
    request_id: UUID

    async def count(
        self,
        bucket: str,
        limit: int,
        seconds: int,
        *identities: str,
        enforce: bool = True,
    ) -> bool:
        suffix = ""
        if identities:
            suffix = ":" + keyed(self.limiter.key, bucket, *identities).hex()
        key = f"limiter:v1:{self.generation}:{bucket}{suffix}"
        try:
            result = await cast(
                "Awaitable[list[int]]",
                self.limiter.redis.eval(
                    COUNT, 2, MARKER, key, self.limiter.marker(self.generation), seconds, limit
                ),
            )
            count, remaining = result
        except RedisError, OSError, ValueError, TypeError:
            count, remaining = -1, 0
        if count < 0:
            raise LimiterUnavailable(self)
        if count == 0 and enforce:
            retry = max(5, ((remaining + 4) // 5) * 5)
            raise HTTPException(429, headers={"Retry-After": str(retry)})
        return count == limit


class LimiterUnavailable(HTTPException):
    def __init__(self, admission: Admission) -> None:
        super().__init__(503)
        self.admission = admission


class Limiter:
    def __init__(
        self, config: Settings, redis: Redis, sessions: async_sessionmaker[AsyncSession], key: bytes
    ) -> None:
        self.config = config
        self.redis = redis
        self.sessions = sessions
        self.key = key

    def marker(self, generation: UUID) -> str:
        return keyed(self.key, "generation", str(generation)).hex()

    async def healthy(self) -> bool:
        async with self.sessions() as session:
            state = await session.get(AuthLimiterState, 1)
        if state is None or state.recover_after is not None:
            return False
        marker = self.marker(state.generation)
        if await self.redis.get(MARKER) != marker.encode():
            return False
        return bool(await self.redis.set(HEALTH, marker, ex=10))

    async def begin(self, request_id: UUID) -> Admission:
        async with self.sessions() as session:
            state = await session.get(AuthLimiterState, 1)
        if state is None or state.recover_after is not None:
            generation = await self.recover(request_id)
            if generation is None:
                raise HTTPException(503)
        else:
            generation = state.generation
        return Admission(self, generation, request_id)

    async def recover(self, request_id: UUID) -> UUID | None:
        async with self.sessions.begin() as session:
            now = await database_now(session)
            await session.execute(
                insert(AuthLimiterState)
                .values(
                    id=1,
                    generation=uuid4(),
                    recover_after=now + timedelta(seconds=self.config.auth_recovery_seconds),
                )
                .on_conflict_do_nothing(index_elements=[AuthLimiterState.id])
            )
            state = await locked_state(session)
            if state.recover_after is None:
                return state.generation
            if state.recover_after > await database_now(session):
                return None
            try:
                marker = self.marker(state.generation)
                # Readiness requires writes, even when the marker already exists
                # from a recovery interrupted before PostgreSQL committed.
                if not await self.redis.set(HEALTH, marker, ex=10):
                    return None
                if not await self.redis.set(MARKER, marker):
                    return None
            except RedisError, OSError:
                return None
            state.recover_after = None
            state.updated_at = await database_now(session)
            session.add(
                AuthAuditEvent(request_id=request_id, action="limiter_recovery", outcome="success")
            )
            return state.generation

    async def mark_unavailable(self, generation: UUID, request_id: UUID) -> None:
        async with self.sessions.begin() as session:
            state = await locked_state(session)
            if state.generation == generation and state.recover_after is None:
                now = await database_now(session)
                state.generation = uuid4()
                state.updated_at = now
                state.recover_after = now + timedelta(seconds=self.config.auth_recovery_seconds)
                session.add(
                    AuthAuditEvent(
                        request_id=request_id, action="limiter_recovery", outcome="unavailable"
                    )
                )


async def locked_state(session: AsyncSession) -> AuthLimiterState:
    state = await session.scalar(
        select(AuthLimiterState).where(AuthLimiterState.id == 1).with_for_update()
    )
    if state is None:
        raise HTTPException(503)
    return state


async def database_now(session: AsyncSession) -> datetime:
    value = await session.scalar(select(func.clock_timestamp()))
    assert isinstance(value, datetime)
    return value
