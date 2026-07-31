# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-model): define canonical graph edge contract`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 2 en curso; nodos y relaciones canónicas del grafo definidos
- **Estado general:** stable scaffolding; quality, testing, CI, core contracts and base graph model active

## 2. Objetivo actual

Construir el modelo canónico de grafo antes de incorporar ingesta, escaneo, parsing, builder, store, API, CLI o web. La prioridad inmediata es completar metadata común de procedencia y confianza para que nodos y relaciones puedan distinguir evidencia confirmada, inferencias y validaciones humanas sin depender de almacenamiento o UI.

## 3. Último commit completado

- **Commit:** `feat(graph-model): define canonical graph edge contract`
- **Resultado:** se agregó el contrato canónico inicial de relaciones en `@codestellation/graph-model`.
- **Paquete principal:** `packages/graph-model`.
- **Archivo principal:** `packages/graph-model/src/edges.ts`.
- **Identificador agregado:** `GraphEdgeId`, serializable con prefijo `edge:` y validación runtime.
- **Relaciones MVP 1:** `contains`, `imports`, `exports`, `declares`, `calls`, `references` y `depends-on`.
- **Direccionalidad:** campo explícito `direction`; en el esquema inicial todas las relaciones soportadas deben ser `directed`.
- **Extremos:** cada edge enlaza `fromNodeId` y `toNodeId` usando `GraphNodeId` ya definido en el contrato de nodos.
- **Atributos:** `attributes` acepta valores JSON serializables, finitos, con claves estables y orden determinístico.
- **Ubicación fuente opcional:** `source.path` y `source.range` permiten registrar dónde se observó la relación sin acoplarla a parser, store, API o UI.
- **Validación:** guards runtime, normalización serializable, rechazo de self-loops, endpoints inválidos, direcciones no permitidas, rutas inseguras y atributos no serializables.
- **Pruebas:** se agregaron pruebas para IDs, guards, tipos de relación iniciales, source location, normalización de atributos y rechazos de payloads inválidos.
- **Limitaciones:** todavía no hay metadata compartida de procedencia/confianza, esquema completo del grafo ni validación cruzada entre colecciones de nodos y edges.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(graph-model): add provenance and confidence metadata`
- **Objetivo:** definir metadata común de procedencia y confianza reutilizable por nodos y relaciones del grafo.
- **Archivos o paquetes probables:**
  - `packages/graph-model/src/provenance.ts`;
  - `packages/graph-model/src/nodes.ts`;
  - `packages/graph-model/src/edges.ts`;
  - `packages/graph-model/src/index.ts`;
  - `packages/graph-model/test/provenance.test.ts`;
  - `packages/graph-model/test/nodes.test.ts`;
  - `packages/graph-model/test/edges.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - niveles de confianza `confirmed`, `probable`, `possible` y `human-verified`;
  - score opcional entre 0 y 1;
  - rationale opcional;
  - registros de procedencia con productor, tipo y evidencia;
  - sin dependencia de parser, store, API, UI o proveedor de IA.

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
- La metadata de procedencia y confianza todavía no forma parte de los contratos de nodos o edges.

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
- `packages/graph-model/test/edges.test.ts`
- `packages/graph-model/test/nodes.test.ts`
- `packages/testing-fixtures/src/index.ts`
