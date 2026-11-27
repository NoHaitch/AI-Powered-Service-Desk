# syntax=docker/dockerfile:1
FROM python:3.14.7-slim-trixie AS dependencies
ENV UV_PYTHON_DOWNLOADS=never UV_LINK_MODE=copy
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/pip pip install uv==0.13.10
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

FROM swaggerapi/swagger-ui:v5.32.5 AS swagger

FROM python:3.14.7-slim-trixie AS runtime
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY --from=dependencies /app/.venv /app/.venv
COPY --from=swagger /usr/share/nginx/html/swagger-ui-bundle.js /usr/share/nginx/html/swagger-ui.css /usr/share/nginx/html/favicon-32x32.png ./swagger/
COPY app ./app
COPY alembic.ini ./
COPY migrations ./migrations
RUN install -d -m 0700 -o 10001 -g 10001 /var/lib/service-desk/attachments
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--no-proxy-headers"]
