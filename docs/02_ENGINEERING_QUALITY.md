# Codestellation — Engineering quality baseline

## 1. Purpose

This document defines the first engineering quality baseline for Codestellation. The goal is to keep the monorepo consistent before functional implementation starts, without adding product dependencies ahead of their assigned commits.

The baseline is intentionally small and deterministic:

- TypeScript strictness catches unsafe or unused code during `typecheck`.
- A repository formatting guard catches whitespace drift and line-ending problems.
- A workspace boundary guard protects the architectural dependency direction.
- Vitest executes the shared test suites for apps, packages and scripts.
- Coverage can be generated locally without enforcing thresholds yet.
- GitHub Actions executes the same core checks on remote pushes and pull requests.

## 2. Commands

Run these commands from the repository root:

```bash
pnpm lint
pnpm format:check
pnpm boundaries:check
pnpm typecheck
pnpm test
pnpm coverage
pnpm quality
pnpm run ci:check
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

### `pnpm test`

Runs Vitest once using `vitest.config.ts`.

Test files should live outside compiled `src` trees under one of these patterns:

- `apps/**/test/**/*.test.ts`;
- `apps/**/test/**/*.spec.ts`;
- `packages/**/test/**/*.test.ts`;
- `packages/**/test/**/*.spec.ts`;
- `scripts/**/*.test.ts`.

This keeps workspace builds focused on production sources while still allowing tests to import directly from `src` during development.

### `pnpm coverage`

Runs Vitest with V8 coverage and writes reports to `coverage/`. Coverage thresholds are intentionally not enforced yet because the repository still contains mostly scaffolding. Thresholds should be introduced after contracts and functional modules exist.

### `pnpm quality`

Runs:

1. `pnpm lint`;
2. `pnpm typecheck`;
3. `pnpm test`.

This is the default local confidence command before committing.

### `pnpm run ci:check`

Runs:

1. `pnpm lint`;
2. `pnpm typecheck`;
3. `pnpm test`;
4. `pnpm build`.

This command mirrors the validation sequence executed by the CI workflow, except that CI installs dependencies first with `pnpm install --frozen-lockfile`.

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

## 4. Testing baseline

Vitest is configured at the repository root. The testing baseline follows these rules:

- tests should be deterministic and avoid network access;
- tests should not execute source repositories being analyzed;
- tests should use fixture helpers from `@codestellation/testing-fixtures` when creating repository-shaped data;
- tests should prefer explicit evidence and stable paths over snapshots of large objects;
- tests should avoid coupling to a concrete persistence engine before storage contracts exist.

`packages/testing-fixtures` provides the first shared utilities:

- `normalizeFixturePath` for portable, safe relative paths;
- `createFixtureFile` for stable test files;
- `createFixtureTree` for deterministic file ordering and directory derivation;
- `createRepositoryFixture` for named repository-like fixtures.


## 5. Continuous integration baseline

The CI workflow lives in `.github/workflows/ci.yml` and runs on GitHub Actions.

It is intentionally minimal:

- triggers on pushes to `main`, `develop`, `ft-*` and `feature/**` branches;
- triggers on pull requests targeting `main`, `develop` or `ft-*` branches;
- can be started manually through `workflow_dispatch`;
- checks out the repository with read-only content permissions;
- installs pnpm 11.14.0;
- uses Node.js 22.x;
- restores pnpm cache from `pnpm-lock.yaml`;
- installs dependencies with `pnpm install --frozen-lockfile`;
- executes `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` as separate observable steps.

The workflow does not publish artifacts, deploy builds or run code from analyzed repositories. It only validates the Codestellation workspace itself.

The repository must version `pnpm-lock.yaml` before CI can pass with `--frozen-lockfile`.

## 6. Architecture layers

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

## 7. Explicit non-goals

This commit does not add:

- ESLint or Prettier as dependencies;
- a task orchestrator;
- coverage thresholds;
- application logic;
- API, CLI, web or graph functionality.

Those decisions remain scheduled for later commits when they provide more value than complexity.
