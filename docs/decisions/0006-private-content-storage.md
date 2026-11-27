# ADR 0006 — Private file bytes and domain-specific links

**Status:** Accepted for the local attachment foundation

**Date:** 2026-11-28

Store private immutable file bytes in a Docker named volume. PostgreSQL stores file metadata, quotas, and typed domain links. The local provider owns atomic byte writes, integrity checks, and deletion. This fits the local deployment and keeps future S3-compatible storage behind the provider interface without introducing a cloud dependency.

A PostgreSQL binary column simplifies transaction coordination but puts file traffic and growth into the primary database and backups. Public static hosting would put ticket authorization outside the authoritative application boundary. Local storage keeps access checks in the backend and requires a coordinated database/volume backup and a staged lifecycle for recovering interrupted writes.

Ticket links reference the shared root and are unique per staged upload. Future messages, notes, article revisions, document versions, and generated files have separate typed links. Their parent determines visibility and retention. The private ticket namespace is excluded from RAG. [Content and storage architecture](../architecture/content-storage.md)
