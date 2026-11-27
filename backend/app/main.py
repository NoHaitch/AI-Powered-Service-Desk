from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.docs import get_swagger_ui_html
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import async_sessionmaker
from starlette.exceptions import HTTPException
from starlette.responses import HTMLResponse
from starlette.staticfiles import StaticFiles

from app.core.config import Settings, load_settings
from app.core.database import make_engine
from app.core.errors import http_error, validation_error
from app.core.telemetry import configure_logging, log_request
from app.health import router as health_router


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging(config.log_level)
        async with AsyncExitStack() as resources:
            engine = make_engine(config)
            resources.push_async_callback(engine.dispose)
            redis = Redis(
                host=config.redis_host,
                port=config.redis_port,
                username=config.redis_user,
                password=config.redis_password.get_secret_value(),
                protocol=2,
                driver_info=None,
                socket_connect_timeout=config.probe_timeout_seconds,
                socket_timeout=config.probe_timeout_seconds,
                max_connections=config.redis_max_connections,
            )
            resources.push_async_callback(redis.aclose)
            app.state.engine = engine
            app.state.sessions = async_sessionmaker(engine, expire_on_commit=False)
            app.state.redis = redis
            app.state.probe_timeout_seconds = config.probe_timeout_seconds
            yield

    app = FastAPI(
        title="AI-Powered Service Desk API",
        version="0.1.0",
        description="Local service desk API foundation and operational health checks.",
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
