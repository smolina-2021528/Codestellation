# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-model): add provenance and confidence metadata`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 2 en curso; grafo canónico con nodos, relaciones, procedencia y confianza
- **Estado general:** stable scaffolding; quality, testing, CI, core contracts and base graph model active

## 2. Objetivo actual

Completar el modelo canónico de grafo antes de incorporar ingesta, escaneo, parsing, builder, store, API, CLI o web. La prioridad inmediata es validar colecciones completas de nodos y relaciones para asegurar consistencia de esquema, IDs, endpoints, procedencia y confianza antes de persistir snapshots.

## 3. Último commit completado

- **Commit:** `feat(graph-model): add provenance and confidence metadata`
- **Resultado:** se agregó metadata compartida de confianza y procedencia en `@codestellation/graph-model`.
- **Paquete principal:** `packages/graph-model`.
- **Archivo principal:** `packages/graph-model/src/provenance.ts`.
- **Confianza:** niveles `confirmed`, `probable`, `possible` y `human-verified`, con `score` opcional entre 0 y 1 y `rationale` opcional.
- **Procedencia:** registros versionados con `type`, `producer`, `evidence` y `observedAt` opcional.
- **Tipos de procedencia iniciales:** `source-scan`, `static-analysis`, `semantic-analysis`, `framework-detection`, `human-annotation` y `external-import`.
- **Tipos de evidencia iniciales:** `source-location`, `manifest`, `static-rule`, `heuristic`, `semantic-summary`, `human-note` y `external-reference`.
- **Integración:** `GraphNodeBase` y `GraphEdgeBase` ahora requieren `confidence` y `provenance`.
- **Normalización:** helpers serializables normalizan texto, ordenan evidencia/registros y preservan timestamps ISO.
- **Validación:** guards runtime rechazan scores fuera de rango, tipos desconocidos, registros sin evidencia y nodos/edges sin procedencia.
- **Pruebas:** se agregaron pruebas para metadata de confianza/procedencia y se actualizaron pruebas de nodos y edges.
- **Limitaciones:** todavía no existe validación de un grafo completo, por lo que no se verifica unicidad global ni que los endpoints de edges existan dentro de una colección.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(graph-model): add graph schema validation`
- **Objetivo:** validar colecciones completas de nodos y relaciones del grafo sin depender de store, API, UI o parser concreto.
- **Archivos o paquetes probables:**
  - `packages/graph-model/src/schema.ts`;
  - `packages/graph-model/src/index.ts`;
  - `packages/graph-model/test/schema.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - estructura versionada para un grafo/snapshot canónico;
  - validación de colecciones de nodos y edges;
  - unicidad de IDs;
  - endpoints de edges existentes;
  - nodo raíz de proyecto válido;
  - errores explícitos o diagnostics reutilizables sin acoplarse a persistencia.

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
pnpm --filter @codestellation/graph-model typecheck
pnpm test -- packages/graph-model/test/provenance.test.ts
pnpm test -- packages/graph-model/test/nodes.test.ts
pnpm test -- packages/graph-model/test/edges.test.ts
```

## 7. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.
- Los IDs de nodos y edges son identificadores canónicos; todavía no garantizan unicidad global contra un store porque no existe persistencia.
- La validación de nodos y edges verifica payloads individuales, pero todavía no valida consistencia cruzada de un grafo completo.
- La metadata de procedencia y confianza ya es obligatoria para nodos y edges, por lo que los próximos builders deberán crear evidencia desde el primer momento.

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
- `packages/graph-model/src/edges.ts`
- `packages/graph-model/src/index.ts`
- `packages/graph-model/src/nodes.ts`
- `packages/graph-model/src/provenance.ts`
- `packages/graph-model/test/edges.test.ts`
- `packages/graph-model/test/nodes.test.ts`
- `packages/graph-model/test/provenance.test.ts`
- `packages/testing-fixtures/src/index.ts`
