---
name: itsm-domain-review
description: Verify business rules for incidents, ticket lifecycle, priority, support tiers, SLAs, assignment, and escalation.
---

# ITSM domain review

1. Read the ticketing requirements in [project context](../../PROJECT_CONTEXT.md#required-ticketing-model-support-tiers-and-priority) and any approved domain specification. Keep tier, priority, lifecycle status, and ticket type separate.
2. Check actor permissions, permitted transitions, and audit events. Validate the impact and urgency matrix, override reasons, handoff history, and SLA calendar and pause rules where affected. Verify escalation does not silently reset elapsed time or deadlines.
3. Exercise boundaries, unauthorized changes, direct routing, concurrent updates, and retries where relevant. Keep ML or AI recommendations advisory to deterministic domain rules. Surface unspecified policy before encoding it.
