# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(analyzer-static): extract imports and exports`
- **Número operativo:** Commit 024
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 5 con parser TypeScript y análisis estático inicial de imports/exports
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static import/export analyzer active; graph builder not started yet

## 2. Objetivo actual

Iniciar `@codestellation/analyzer-static` para consumir resultados normalizados de `@codestellation/parser-core` y convertir imports/exports parseados en registros de análisis estático listos para relaciones futuras. Este commit no resuelve módulos contra filesystem, no lee archivos, no crea nodos ni edges del grafo y no ejecuta código del repositorio analizado.

## 3. Último commit completado

- **Commit:** `feat(analyzer-static): extract imports and exports`
- **Paquete principal:** `packages/analyzer-static`.
- **Archivo principal nuevo:** `packages/analyzer-static/src/import-export-analysis.ts`.
- **Export público actualizado:** `packages/analyzer-static/src/index.ts`.
- **Dependencia declarada:** `@codestellation/parser-core` como workspace dependency con tipos consumidos desde `src` para no depender de `dist` previo durante `typecheck`.
- **Entrada soportada:** `ParserCoreParseUnitResult` y `ParserCoreParseBatchResult` ya normalizados por `parser-core`.
- **Salida:** `AnalyzerStaticFileAnalysis` por archivo y `AnalyzerStaticImportExportAnalysisResult` agregado, ambos serializables, versionados y con summaries consistentes.
- **Imports:** se conservan `moduleSpecifier`, `importKind`, rango opcional, archivo origen, clasificación de specifier (`relative`, `absolute`, `package`, `builtin`, `unknown`), bandera `isTypeOnly` y bandera `isDynamic`.
- **Exports:** se conservan `exportKind`, nombre opcional, re-export source opcional, clasificación del source specifier, archivo origen, rango opcional, bandera `isTypeOnly` y bandera `isReExport`.
- **Diagnósticos:** el analizador introduce códigos `ANALYZER_STATIC_*` para parse units skipped/failed y no mezcla esos diagnósticos con los `PARSER_*` de parser-core.
- **Modo seguro:** el analizador no importa `parser-typescript`, no lee archivos desde disco, no resuelve módulos, no interpreta contenido adicional y no ejecuta código.
- **Pruebas:** se agregó `packages/analyzer-static/test/import-export-analysis.test.ts` para extracción batch, parse units fallidos, clasificación de specifiers y validación de contratos inconsistentes.
- **Limitación principal:** todavía no existe adaptador desde `repository-scanner` hacia `parser-core`, no se lee contenido desde filesystem, no se resuelven módulos, no se crea grafo y no se conectan imports/exports con nodos reales.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(graph-builder): create project folder and file nodes`
- **Objetivo:** iniciar `@codestellation/graph-builder` creando nodos canónicos de proyecto, carpetas y archivos desde estructura/inventario disponible, sin crear todavía relaciones de imports/exports.
- **Archivos probables:**
  - `packages/graph-builder/src/project-file-nodes.ts` o equivalente;
  - `packages/graph-builder/src/index.ts`;
  - `packages/graph-builder/test/project-file-nodes.test.ts`;
  - `packages/graph-builder/package.json` si requiere dependencias directas a `graph-model` y/o contratos estructurales del scanner;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - crear nodos `project`, `folder` y `file` compatibles con `graph-model`;
  - preservar procedencia/confianza obligatoria;
  - mantener salida determinística y serializable;
  - no crear edges de imports/exports todavía;
  - no resolver módulos ni leer contenido adicional.

## 5. Reglas activas para los próximos commits

- Entregar únicamente archivos nuevos o modificados, no el proyecto completo.
- Entregar patch cuando el usuario lo solicite explícitamente.
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

Validación focalizada para el Commit 024:

```bash
pnpm --filter @codestellation/parser-core typecheck
pnpm --filter @codestellation/analyzer-static typecheck
pnpm test -- packages/parser-core/test/parser-result.test.ts packages/analyzer-static/test/import-export-analysis.test.ts
```

## 7. Riesgos conocidos

- El entorno debe tener pnpm 11.14.0 disponible para reproducir exactamente la validación del workspace y el lockfile.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen unions y validaciones más complejas.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan más módulos funcionales.
- El matcher de globs del inventario cubre los patrones iniciales del MVP 1, pero no reemplaza por completo a minimatch.
- Los tests de symlinks dependen de permisos del sistema operativo y deben seguir tolerando restricciones de Windows.
- El inventario todavía no calcula hashes; esa responsabilidad sigue pendiente de decisión entre scanner y snapshots incrementales.
- Las reglas de clasificación por nombre/extensión son heurísticas iniciales y deben seguir siendo visibles, configurables y auditables.
- La detección de manifests todavía no valida contenido de `package.json`; por ahora solo detecta presencia por path, nombre y metadata del inventario.
- El resumen estructural no resuelve workspaces ni dependencias; solo calcula estructura desde paths e inventario.
- Los contratos de parser core todavía no tienen adaptador desde `repository-scanner`; se mantienen estructurales hasta integrar el pipeline.
- El parser TypeScript solo parsea texto fuente provisto explícitamente; todavía no existe lectura de contenido de archivos desde el pipeline.
- El parser TypeScript no crea `Program`, no usa type checker y no resuelve imports contra archivos reales.
- El analizador estático clasifica module specifiers pero todavía no los resuelve contra filesystem, package manifests, tsconfig paths o aliases.
- Los resultados del scanner conservan paths locales serializables; las capas de API y UI deberán evitar exponer rutas sensibles sin una política explícita.

## 8. Archivos clave actuales

- `README.md`
- `CODESTELLATION_DECISIONS.md`
- `CODESTELLATION_PROJECT_STATE.md`
- `.github/workflows/ci.yml`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `vitest.config.ts`
- `scripts/check-format.mjs`
- `scripts/check-workspace-boundaries.mjs`
- `docs/00_CODESTELLATION_MASTER_PLAN.md`
- `docs/01_ARCHITECTURE_AND_COMPONENTS.md`
- `docs/02_ENGINEERING_QUALITY.md`
- `docs/04_AI_DEVELOPMENT_PLAYBOOK.md`
- `packages/contracts/src/ids.ts`
- `packages/contracts/src/diagnostics.ts`
- `packages/contracts/src/errors.ts`
- `packages/graph-model/src/nodes.ts`
- `packages/graph-model/src/edges.ts`
- `packages/graph-model/src/provenance.ts`
- `packages/graph-model/src/schema.ts`
- `packages/source-ingestion/src/input.ts`
- `packages/source-ingestion/src/local-folder.ts`
- `packages/source-ingestion/src/file-inventory.ts`
- `packages/repository-scanner/src/scan-result.ts`
- `packages/repository-scanner/src/file-classifier.ts`
- `packages/repository-scanner/src/package-manifest.ts`
- `packages/repository-scanner/src/repository-structure.ts`
- `packages/parser-core/src/parser-result.ts`
- `packages/parser-core/test/parser-result.test.ts`
- `packages/parser-typescript/src/typescript-parser.ts`
- `packages/parser-typescript/test/typescript-parser.test.ts`
- `packages/analyzer-static/src/import-export-analysis.ts`
- `packages/analyzer-static/test/import-export-analysis.test.ts`
