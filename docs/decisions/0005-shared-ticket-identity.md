# ADR 0005 — Shared ticket identity and incident details

**Status:** Accepted

**Date:** 2026-11-27

## Decision

Create a minimal `tickets` root in M1 for identity, requester, queue, shared text, timestamps, and revision. Store incident lifecycle and assessment in `incident_details`. M1 accepts only incident tickets. A shared primary key and deferred reverse foreign key require one incident detail row per ticket at commit. No request subtype ships in this revision.

Keep the UUID as the API resource identifier and add a separate immutable reference for people to quote. PostgreSQL allocates `INC-` references from a sequence. Sequences remain unique under concurrent inserts and may leave gaps after failures or rollbacks. The API paths and authorization rules remain governed by the [M0 contract](../architecture/m0-authentication-design.md#api-contract).

Store incident and authentication audits separately. They have different retention rules and access needs. The runtime role can append events using server timestamps. An explicit maintenance role runs authentication audit retention without receiving broad audit table privileges.

## Alternatives and consequences

A standalone incidents table would need a later identity backfill when conversations, routing history, and SLAs support a second ticket type. A single wide tickets table would mix incident and request fields and increase the number of nullable or inapplicable values. The shared root introduces a second insert and a temporary circular constraint. Issue both inserts in one transaction and test commit-time integrity.

When a second ticket type is approved, replace the M1 incident-only check and unconditional reverse foreign key together. A candidate is a discriminator plus generated nullable subtype keys and deferred foreign keys that require exactly the subtype matching the discriminator. The M2 migration must prove completeness and type matching before it accepts request rows. Existing UUIDs and incident references remain stable. [Database architecture](../architecture/database-schema.md)
