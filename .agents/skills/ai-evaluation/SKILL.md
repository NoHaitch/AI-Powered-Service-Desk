---
name: ai-evaluation
description: Define and run evaluations for changes to retrieval, embeddings, prompts, LLM providers, generation, classical ML, or agent workflows.
---

# AI evaluation

1. Select a representative labeled or reviewed dataset and record provenance, split strategy, version, reproducibility settings, and limitations. Define baselines, metrics, and thresholds before inspecting the final holdout.
2. Follow the [testing standards](../../rules/TESTING_STANDARDS.md). For retrieval, compare sparse, dense, and hybrid under the same query set and access filters. Score generation separately for grounding, citations, relevance, and abstention. For ML, check leakage, macro F1, per-class metrics, calibration, and latency. For workflows, cover approved, denied, injection, and failure paths.
3. Run deterministic offline checks first. Opt in to real calls only within an approved quota. Report measured outcomes, configuration, cost where available, and evidence gaps.
