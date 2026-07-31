# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(contracts): define project source and snapshot identifiers`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 2 iniciada; contratos base de identificadores listos
- **Estado general:** stable scaffolding; quality, testing, CI and first contracts active

## 2. Objetivo actual

Construir los contratos canónicos compartidos antes de incorporar ingesta, escaneo, parsing, grafo, API, CLI o web. La prioridad inmediata es mantener tipos serializables, validables y desacoplados de cualquier persistencia concreta.

## 3. Último commit completado

- **Commit:** `feat(contracts): define project source and snapshot identifiers`
- **Resultado:** se agregaron los identificadores base del MVP 1 en `@codestellation/contracts`.
- **Paquete principal:** `packages/contracts`.
- **Contratos definidos:** `ProjectId`, `SourceId`, `SourceFileId`, `SourceRevisionId` y `SnapshotId`.
- **Formato:** strings serializables con prefijos explícitos: `project:`, `source:`, `file:`, `revision:` y `snapshot:`.
- **Seguridad base:** los tokens rechazan valores vacíos, whitespace externo, espacios internos, segmentos `.` o `..`, backslashes y segmentos vacíos.
- **Nominalidad:** las marcas de TypeScript evitan mezclar identificadores por accidente en código tipado.
- **Helpers:** creación, parsing, type guards, serialización explícita y validación de tokens.
- **Fuentes MVP 1:** `local-folder`, `zip-archive` y `git-repository`.
- **Pruebas:** se agregó suite de tests para IDs válidos, inválidos, guards, source kinds e identidad de snapshots.
- **Limitaciones:** todavía no hay errores estructurados, códigos de diagnóstico, esquema de grafo ni persistencia.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(contracts): define structured errors and diagnostics`
- **Objetivo:** definir errores serializables y diagnósticos estables para que los paquetes posteriores reporten fallas sin exponer secretos ni depender de clases internas.
- **Archivos o paquetes probables:**
  - `packages/contracts/src/errors.ts`;
  - `packages/contracts/src/diagnostics.ts`;
  - `packages/contracts/src/index.ts`;
  - `packages/contracts/test/errors.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - errores serializables;
  - códigos estables;
  - bandera `retryable`;
  - severidad de diagnóstico;
  - contexto seguro y sin secretos;
  - pruebas de serialización y validación.

## 5. Reglas activas para los próximos commits

- Entregar únicamente archivos nuevos o modificados, no el proyecto completo.
- No entregar patches salvo solicitud explícita.
- Mantener commits pequeños, atómicos y verificables.
- Actualizar este documento al terminar cada commit.
- Mantener `README.md` sincronizado solo cuando cambien comandos, estado o navegación principal.
- Ejecutar o documentar las validaciones relevantes en cada entrega.
- No introducir dependencias externas sin una razón vinculada al commit.
- Evitar lógica funcional fuera del alcance exacto del commit.
- Preservar operación local-first y no ejecutar código de repositorios analizados.

## 6. Comandos de validación vigentes

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm run ci:check
```

En CI se ejecuta la secuencia remota mínima:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para este commit también es útil validar de forma focalizada:

```bash
pnpm --filter @codestellation/contracts typecheck
pnpm test -- packages/contracts/test/ids.test.ts
```

## 7. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.
- Los IDs de archivos son identificadores canónicos; todavía no representan metadata completa de path, hash, lenguaje o contenido.

## 8. Archivos clave actuales

- `README.md`
- `CODESTELLATION_DECISIONS.md`
- `CODESTELLATION_PROJECT_STATE.md`
- `.github/workflows/ci.yml`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `vitest.config.ts`
- `.editorconfig`
- `scripts/check-format.mjs`
- `scripts/check-workspace-boundaries.mjs`
- `docs/00_CODESTELLATION_MASTER_PLAN.md`
- `docs/01_ARCHITECTURE_AND_COMPONENTS.md`
- `docs/02_ENGINEERING_QUALITY.md`
- `docs/04_AI_DEVELOPMENT_PLAYBOOK.md`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/ids.ts`
- `packages/contracts/test/ids.test.ts`
- `packages/testing-fixtures/src/index.ts`
