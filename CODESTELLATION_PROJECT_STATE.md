# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-02
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-model): add graph schema validation`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 2 en curso; grafo canónico validable como snapshot completo
- **Estado general:** stable scaffolding; quality, testing, CI, core contracts and validated graph model active

## 2. Objetivo actual

Completar el modelo canónico de grafo antes de incorporar ingesta, escaneo, parsing, builder, store, API, CLI o web. La prioridad inmediata pasa a definir contratos de ingesta local para que las siguientes piezas puedan producir nodos, relaciones y snapshots ya validados.

## 3. Último commit completado

- **Commit:** `feat(graph-model): add graph schema validation`
- **Resultado:** se agregó validación de snapshots completos en `@codestellation/graph-model`.
- **Paquete principal:** `packages/graph-model`.
- **Archivo principal:** `packages/graph-model/src/schema.ts`.
- **Estructura canónica:** `CanonicalGraphSnapshot` con `schemaVersion`, `rootNodeId`, `nodes` y `edges`.
- **Versión de esquema:** `CANONICAL_GRAPH_SCHEMA_VERSION = 1`.
- **Validación:** `validateCanonicalGraphSnapshot`, `assertCanonicalGraphSnapshot` e `isCanonicalGraphSnapshot`.
- **Serialización:** `toSerializableCanonicalGraphSnapshot` normaliza nodos y relaciones y los ordena de forma determinística por ID.
- **Issues explícitos:** se definen códigos estables para forma inválida, versión no soportada, raíz inválida, raíz ausente, raíz no proyecto, conteo inválido de proyectos raíz, nodos/edges inválidos, IDs duplicados, padres ausentes, self-parent y endpoints faltantes.
- **Consistencia cruzada:** se verifica unicidad global de IDs de nodos y relaciones, existencia de `rootNodeId`, raíz de tipo `project`, exactamente un proyecto raíz, padres existentes para nodos no proyecto y endpoints existentes para todas las relaciones válidas.
- **Pruebas:** se agregaron pruebas para snapshot válido, guards de issues, duplicados, endpoints faltantes, raíz inválida, referencias de padres, payloads inválidos y normalización determinística.
- **Limitaciones:** todavía no hay contratos de ingesta de fuentes, escaneo de repositorio, parser TypeScript, graph builder, persistencia ni CLI funcional.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(source-ingestion): define local source input contracts`
- **Objetivo:** definir contratos de entrada para carpetas locales, ZIPs y repositorios Git públicos sin ejecutar todavía ingesta real.
- **Archivos o paquetes probables:**
  - `packages/source-ingestion/src/input.ts`;
  - `packages/source-ingestion/src/index.ts`;
  - `packages/source-ingestion/test/input.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - tipos de entrada versionados;
  - soporte contractual para `local-folder`, `zip-archive` y `git-repository`;
  - rutas y URLs validadas sin ejecutar código externo;
  - validación serializable;
  - sin dependencia de parser, scanner, store, API o UI.

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
pnpm test -- packages/graph-model/test/schema.test.ts
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
- La validación de snapshots completos todavía no impone reglas semánticas avanzadas, como que todo edge `contains` coincida con `parentId`; eso queda para el builder o reglas de análisis posteriores.
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
- `packages/graph-model/src/schema.ts`
- `packages/graph-model/test/edges.test.ts`
- `packages/graph-model/test/nodes.test.ts`
- `packages/graph-model/test/provenance.test.ts`
- `packages/graph-model/test/schema.test.ts`
- `packages/testing-fixtures/src/index.ts`
