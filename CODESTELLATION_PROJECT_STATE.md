# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(contracts): define structured errors and diagnostics`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 2 en curso; identificadores, errores y diagnósticos base listos
- **Estado general:** stable scaffolding; quality, testing, CI and core contracts active

## 2. Objetivo actual

Construir los contratos canónicos compartidos antes de incorporar ingesta, escaneo, parsing, grafo, API, CLI o web. La prioridad inmediata es mantener tipos serializables, validables, seguros para logs y desacoplados de cualquier persistencia concreta.

## 3. Último commit completado

- **Commit:** `feat(contracts): define structured errors and diagnostics`
- **Resultado:** se agregaron errores estructurados y diagnósticos serializables en `@codestellation/contracts`.
- **Paquete principal:** `packages/contracts`.
- **Diagnósticos definidos:** `CodestellationDiagnostic`, `DiagnosticCode`, `DiagnosticSeverity`, `DiagnosticContext` y helpers de creación, parsing, guards y serialización.
- **Errores definidos:** `CodestellationError`, `createCodestellationError`, `toCodestellationDiagnostic` y `toCodestellationError`.
- **Formato:** objetos JSON-safe con `schemaVersion`, `code`, `severity`, `message`, `retryable`, `context` y `causeCode` opcional.
- **Códigos base:** `CONTRACTS_INVALID_ARGUMENT`, `CONTRACTS_VALIDATION_FAILED` y `CONTRACTS_UNEXPECTED_ERROR`.
- **Severidades:** `debug`, `info`, `warning`, `error` y `fatal`.
- **Seguridad base:** el contexto se ordena, acepta solo claves seguras, elimina valores no serializables, recorta strings largos y redacta claves sensibles como `token`, `password`, `secret`, `authorization`, `cookie`, `credential` y `apiKey`.
- **Pruebas:** se agregaron suites para serialización, validación de códigos, sanitización de contexto, guards runtime, conversión de errores conocidos y fallback seguro para errores desconocidos.
- **Limitaciones:** todavía no hay contrato de nodos, contrato de edges, metadata de procedencia, esquema de grafo ni validación de grafos completos.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(graph-model): define canonical graph node contract`
- **Objetivo:** definir el contrato canónico de nodos del grafo sin acoplarlo a almacenamiento, visualización o parser concreto.
- **Archivos o paquetes probables:**
  - `packages/graph-model/src/nodes.ts`;
  - `packages/graph-model/src/index.ts`;
  - `packages/graph-model/test/nodes.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - tipos de nodo versionados;
  - identificadores de nodo serializables;
  - jerarquía inicial de proyecto, paquete, carpeta, archivo y símbolo;
  - datos mínimos para visualización y análisis;
  - sin dependencia de parser, store, API o UI.

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
pnpm test -- packages/contracts/test/diagnostics.test.ts packages/contracts/test/errors.test.ts
```

## 7. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.
- Los IDs de archivos son identificadores canónicos; todavía no representan metadata completa de path, hash, lenguaje o contenido.
- La sanitización de contexto evita exponer claves sensibles comunes, pero los paquetes consumidores deben seguir evitando enviar secretos en mensajes o contextos.

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
- `packages/contracts/src/diagnostics.ts`
- `packages/contracts/src/errors.ts`
- `packages/contracts/src/ids.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/test/diagnostics.test.ts`
- `packages/contracts/test/errors.test.ts`
- `packages/contracts/test/ids.test.ts`
- `packages/testing-fixtures/src/index.ts`
