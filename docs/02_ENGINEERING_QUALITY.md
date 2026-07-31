# Codestellation — Engineering quality baseline

## 1. Purpose

This document defines the first engineering quality baseline for Codestellation. The goal is to keep the monorepo consistent before functional implementation starts, without adding a test runner, coverage, CI, bundler or product dependencies ahead of their assigned commits.

The baseline is intentionally small and deterministic:

- TypeScript strictness catches unsafe or unused code during `typecheck`.
- A repository formatting guard catches whitespace drift and line-ending problems.
- A workspace boundary guard protects the architectural dependency direction.

## 2. Commands

Run these commands from the repository root:

```bash
pnpm lint
pnpm format:check
pnpm boundaries:check
pnpm typecheck
pnpm quality
```

### `pnpm lint`

Runs both repository-level guards:

1. `scripts/check-format.mjs`
2. `scripts/check-workspace-boundaries.mjs`

It does not run a third-party linter yet. That keeps the bootstrap installable and avoids introducing parser/version coupling before the codebase has real implementation files.

### `pnpm format:check`

Validates text files for:

- final newline;
- LF line endings;
- absence of trailing whitespace.

The formatting source of truth is `.editorconfig`.

### `pnpm boundaries:check`

Validates workspace structure and imports:

- workspace package names must be unique;
- every package must belong to a known architecture layer;
- lower layers must not depend on higher layers;
- packages must not depend on applications;
- `@codestellation/*` imports must reference known workspaces;
- relative imports must not escape their own workspace root.

## 3. TypeScript baseline

`tsconfig.base.json` enables strict TypeScript and additional guardrails:

- `exactOptionalPropertyTypes`;
- `noImplicitOverride`;
- `noUncheckedIndexedAccess`;
- `noUnusedLocals`;
- `noUnusedParameters`;
- `useUnknownInCatchVariables`;
- `allowUnreachableCode: false`;
- `allowUnusedLabels: false`;
- `verbatimModuleSyntax`.

This means unused imports, unused local declarations and several unsafe patterns should fail during `pnpm typecheck`.

## 4. Architecture layers

The boundary checker uses this initial layer model:

| Layer | Workspaces |
|---:|---|
| 10 | `contracts`, `config`, `observability`, `testing-fixtures` |
| 20 | `graph-model` |
| 30 | `source-ingestion`, `repository-scanner`, `parser-core`, `parser-typescript`, `analyzer-static`, `analyzer-frameworks`, `analyzer-semantic` |
| 40 | `graph-builder`, `graph-store`, `search-index` |
| 50 | `context-engine`, `impact-engine`, `snapshot-engine`, `exporter` |
| 60 | `agent-adapter` |
| 70 | `apps/api`, `apps/cli`, `apps/web` |

A workspace may depend on the same or lower layers. A lower layer may not depend on a higher layer.

## 5. Explicit non-goals

This commit does not add:

- automated tests;
- coverage;
- GitHub Actions or another CI provider;
- ESLint or Prettier as dependencies;
- a task orchestrator;
- application logic.

Those decisions remain scheduled for later commits when they provide more value than complexity.
