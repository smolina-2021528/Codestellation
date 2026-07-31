# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-model): define canonical graph node contract`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 2 en curso; nodos canónicos del grafo definidos
- **Estado general:** stable scaffolding; quality, testing, CI, core contracts and graph node model active

## 2. Objetivo actual

Construir el modelo canónico de grafo antes de incorporar ingesta, escaneo, parsing, builder, store, API, CLI o web. La prioridad inmediata es mantener contratos serializables, versionados, validables y libres de acoplamiento a persistencia o visualización concreta.

## 3. Último commit completado

- **Commit:** `feat(graph-model): define canonical graph node contract`
- **Resultado:** se agregó el contrato canónico inicial de nodos en `@codestellation/graph-model`.
- **Paquete principal:** `packages/graph-model`.
- **Archivo principal:** `packages/graph-model/src/nodes.ts`.
- **Identificador agregado:** `GraphNodeId`, serializable con prefijo `node:` y validación runtime.
- **Rutas agregadas:** `RepositoryPath`, siempre relativa a la raíz de la fuente y sin segmentos de traversal.
- **Tipos de nodo MVP 1:** `project`, `package`, `folder`, `file` y `symbol`.
- **Payloads definidos:** `ProjectGraphNode`, `PackageGraphNode`, `FolderGraphNode`, `FileGraphNode` y `SymbolGraphNode`.
- **Metadata común:** `schemaVersion`, `id`, `kind`, `parentId`, `display` y `analysis`.
- **Metadata visual mínima:** `label`, `subtitle` y `description`.
- **Metadata de análisis mínima:** `tags` y `facets` ordenables y serializables.
- **Datos técnicos iniciales:** package manager, lenguaje fuente, extensión, conteo de líneas, tipo de símbolo, tipo de export y rango fuente.
- **Validación:** guards runtime, normalización serializable, validación de jerarquía mínima y validación de rangos fuente.
- **Pruebas:** se agregaron pruebas para IDs, rutas, nodos por tipo, normalización y rechazos de payloads inválidos.
- **Limitaciones:** todavía no hay contrato de relaciones, procedencia/confianza, esquema completo de grafo ni validación cruzada entre nodos y edges.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(graph-model): define canonical graph edge contract`
- **Objetivo:** definir el contrato canónico de relaciones del grafo sin acoplarlo a almacenamiento, visualización o parser concreto.
- **Archivos o paquetes probables:**
  - `packages/graph-model/src/edges.ts`;
  - `packages/graph-model/src/index.ts`;
  - `packages/graph-model/test/edges.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - tipos de edge versionados;
  - identificadores de edge serializables;
  - relaciones iniciales como contiene, importa, exporta, declara, llama, referencia y depende de;
  - direccionalidad explícita;
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
pnpm --filter @codestellation/graph-model typecheck
pnpm test -- packages/graph-model/test/nodes.test.ts
```

## 7. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.
- Los IDs de nodos son identificadores canónicos; todavía no garantizan unicidad global contra un store porque no existe persistencia.
- La validación de nodos verifica payloads individuales, pero todavía no valida consistencia cruzada con un grafo completo.

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
- `packages/graph-model/src/index.ts`
- `packages/graph-model/src/nodes.ts`
- `packages/graph-model/test/nodes.test.ts`
- `packages/testing-fixtures/src/index.ts`
