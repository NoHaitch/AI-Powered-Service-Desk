# Docker and containerization standards

Apply these standards to the frontend, backend, database, cache, ML inference, and supporting infrastructure. Docker Compose remains the reference deployment.

## Images and builds

- Prefer lightweight official or upstream-maintained images. Consider Alpine or slim variants when the dependencies, native libraries, and supported platforms work reliably. Prefer a compatible image when the smaller variant would complicate support or builds.
- Pin base and Compose image versions and avoid floating tags such as `latest`. Use digests when byte-for-byte image selection matters. Review pinned image updates for security fixes. Install application dependencies from committed lockfiles with frozen resolution where available.
- Use multi-stage builds when they separate tooling and build dependencies from the final runtime. Include only the runtime, production dependencies, application artifacts, and system packages the service needs. Reuse pinned upstream images directly for infrastructure unless a custom build serves a concrete need.
- Copy dependency manifests and lockfiles before frequently changed source files to reuse build layers. Use a focused build context and an appropriate `.dockerignore` to exclude credentials, local data, caches, dependency directories, and unrelated files.

## Runtime and Compose

- Run as a non-root user where supported. Preserve upstream initialization behavior and verify data-directory permissions for stateful services. Use the minimum privileges and capabilities required by the service.
- Supply runtime secrets through approved local secret files or injection. Use build-time secret mounts when builds require credentials. Keep secrets out of Dockerfiles, build arguments, image layers, and public frontend assets.
- Publish only necessary ports. Bind local entry points to loopback and keep database, cache, and internal inference ports on private Compose networks. Document any deliberate additional exposure.
- Apply the [security standards](SECURITY_STANDARDS.md) at service boundaries. Use dedicated service credentials where applicable. Avoid privileged containers, host networking, and Docker socket mounts unless a reviewed requirement justifies them. Prefer restricted mounts and read-only filesystems where compatible.
- Configure service-specific health checks and use readiness-aware startup dependencies where required. Keep retries and failure handling in calling services. Use named volumes for durable data and document backup, restore, and migration behavior.

## Development and release

- Allow dev tooling, live reload, and source mounts in development targets or Compose overrides. Use optimized release images without dev servers, source mounts, or dev-only dependencies. Verify release images locally even when public hosting is deferred.
- Build the React/Vite frontend with Bun. For a release configuration, prefer serving the compiled assets from a lightweight static web server. Select the server and API routing during implementation. Handle client routes on reload without routing API requests to the SPA fallback.
- Verify applicable Compose configurations, clean builds, startup and health, published ports, and data persistence across container recreation. Smoke-test the release stack and check rejected unauthorized service calls or unavailable dependencies where relevant. Run appropriate image security checks and record evidence.

[Docker build best practices](https://docs.docker.com/build/building/best-practices/)
