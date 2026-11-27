from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.docs import get_swagger_ui_html
from redis.asyncio import BlockingConnectionPool, Redis
from redis.asyncio.retry import Retry
from redis.backoff import NoBackoff
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.exc import TimeoutError as DatabaseTimeout
from sqlalchemy.ext.asyncio import async_sessionmaker
from starlette.exceptions import HTTPException
from starlette.responses import HTMLResponse, JSONResponse
from starlette.staticfiles import StaticFiles

from app.core.config import Settings, load_settings
from app.core.database import make_engine
from app.core.errors import error_response, http_error, validation_error
from app.core.telemetry import configure_logging, log_request, logger
from app.health import HealthStatus, auth_health
from app.health import router as health_router
from app.identity.limiter import Limiter, LimiterUnavailable
from app.identity.routes import Passwords
from app.identity.routes import router as auth_router
from app.identity.security import BrowserSecurity
from app.tickets.routes import router as tickets_router


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else load_settings()
    security = BrowserSecurity.from_settings(config) if config.auth_enabled else None

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging(config.log_level)
        async with AsyncExitStack() as resources:
            engine = make_engine(config)
            resources.push_async_callback(engine.dispose)
            pool = BlockingConnectionPool(
                host=config.redis_host,
                port=config.redis_port,
                username=config.redis_user,
                password=config.redis_password.get_secret_value(),
                protocol=2,
                driver_info=None,
                socket_connect_timeout=config.probe_timeout_seconds,
                socket_timeout=config.probe_timeout_seconds,
                max_connections=config.redis_max_connections,
                timeout=config.probe_timeout_seconds,
                retry=Retry(NoBackoff(), 0),
            )
            redis = Redis.from_pool(pool)
            resources.push_async_callback(redis.aclose)
            app.state.engine = engine
            app.state.sessions = async_sessionmaker(engine, expire_on_commit=False)
            app.state.redis = redis
            app.state.probe_timeout_seconds = config.probe_timeout_seconds
            app.state.settings = config
            if security is not None:
                app.state.browser_security = security
                app.state.passwords = Passwords(config.auth_hash_workers)
                app.state.auth_limiter = Limiter(
                    config, redis, app.state.sessions, security.limiter
                )
            yield

    app = FastAPI(
        title="AI-Powered Service Desk API",
        version="0.1.0",
        description="Local service desk authentication, incident intake, and health checks.",
        lifespan=lifespan,
        openapi_url="/api/openapi.json" if config.swagger_enabled else None,
        docs_url=None,
        redoc_url=None,
        redirect_slashes=False,
    )
    app.middleware("http")(log_request)
    app.add_exception_handler(HTTPException, http_error)
    app.add_exception_handler(RequestValidationError, validation_error)
    app.include_router(health_router)
    if security is not None:
        app.include_router(auth_router)
        app.include_router(tickets_router)
        app.add_api_route(
            "/api/health/auth", auth_health, response_model=HealthStatus, tags=["Health"]
        )

        @app.exception_handler(LimiterUnavailable)
        async def limiter_error(request: Request, exc: Exception) -> JSONResponse:
            assert isinstance(exc, LimiterUnavailable)
            admission = exc.admission
            try:
                await admission.limiter.mark_unavailable(admission.generation, admission.request_id)
            except SQLAlchemyError as error:
                logger.warning(
                    "limiter_recovery_write_failed",
                    extra={
                        "request_id": request.state.request_id,
                        "dependency": "postgres",
                        "outcome": "unavailable",
                        "error_class": type(error).__name__,
                    },
                )
            return await http_error(request, exc)

        @app.exception_handler(OperationalError)
        @app.exception_handler(DatabaseTimeout)
        async def database_error(request: Request, _exc: Exception) -> JSONResponse:
            return error_response(
                request, 503, "unavailable", "A required dependency is unavailable."
            )

    if config.swagger_enabled:
        assets = "/api/docs/assets"
        app.mount(assets, StaticFiles(directory=config.swagger_assets), name="swagger-assets")

        @app.get("/api/docs", include_in_schema=False)
        async def swagger() -> HTMLResponse:
            return get_swagger_ui_html(
                openapi_url="/api/openapi.json",
                title="AI-Powered Service Desk API",
                swagger_js_url=f"{assets}/swagger-ui-bundle.js",
                swagger_css_url=f"{assets}/swagger-ui.css",
                swagger_favicon_url=f"{assets}/favicon-32x32.png",
                swagger_ui_parameters={"persistAuthorization": False, "validatorUrl": None},
            )

    return app
