# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-builder): create import export edges from static analysis`
- **Número operativo:** Commit 029
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 7 con flujo CLI end-to-end y grafo enriquecido por análisis estático opt-in
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static import/export analyzer active; graph builder project/folder/file/package node generation active; metadata-only contains edges active; graph builder import/export edges from static analysis active; CLI local folder graph JSON export active; safe CLI source text parsing pipeline active; CLI opt-in import/export graph enrichment active

## 2. Objetivo actual

Consumir `AnalyzerStaticImportExportAnalysisResult` desde `graph-builder` para generar relaciones canónicas iniciales de imports/exports sin resolver módulos relativos contra filesystem, sin interpretar manifests y sin crear nodos de símbolos. Cuando el CLI se ejecuta con `--parse-source-text`, el JSON exportado puede incluir `GraphBuilderImportExportGraphResult` además del detalle `sourceTextParsing`.

## 3. Último commit completado

- **Commit:** `feat(graph-builder): create import export edges from static analysis`
- **Paquete principal:** `packages/graph-builder`.
- **Archivo principal agregado:** `packages/graph-builder/src/import-export-edges.ts`.
- **Contrato nuevo:** `GraphBuilderImportExportGraphResult`.
- **Función pública nueva:** `buildImportExportGraphFromStaticAnalysis`.
- **Alias público:** `buildImportExportGraph`.
- **Validadores nuevos:** `isGraphBuilderImportExportGraphResult`, `assertGraphBuilderImportExportGraphResult` y `toSerializableGraphBuilderImportExportGraphResult`.
- **CLI actualizado:** cuando `--parse-source-text` está activo, el CLI usa `buildImportExportGraphFromStaticAnalysis` para enriquecer `graph` con edges import/export iniciales.
- **Imports:** se crean edges `imports` desde archivos hacia nodos `package` externos inferidos únicamente para specifiers `package` y `builtin`.
- **Exports:** se crean edges `exports` desde archivos hacia el paquete local propietario o hacia el proyecto raíz si no hay paquete local.
- **Imports no resueltos:** specifiers `relative`, `absolute` y `unknown` se conservan en `unresolvedImportReferences` para una etapa posterior.
- **Nodos externos:** los packages externos son inferidos desde static analysis con confianza `possible` y no se validan contra manifests.
- **Modo seguro:** no resuelve módulos contra disco, `tsconfig`, aliases ni manifests; no lee contenido adicional; no ejecuta código; no crea nodos de símbolos; no crea edges `depends-on` reales.
- **Pruebas:** `packages/graph-builder/test/import-export-edges.test.ts` cubre nodos externos, edges imports/exports, referencias no resueltas, serialización y snapshot canónico. `apps/cli/test/index-local.test.ts` confirma que el CLI opt-in devuelve edges `exports` y referencias import no resueltas para imports relativos.
- **Limitación principal:** todavía no existe resolución de módulos relativos, nodos de símbolos, edges `declares`, `references`, `calls`, ni dependencias package-level reales desde `package.json`.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(graph-builder): create symbol nodes from parser results`
- **Objetivo:** consumir símbolos normalizados de `ParserCoreParseBatchResult` para crear nodos `symbol` y relaciones `declares` archivo→símbolo, sin resolver referencias profundas ni llamadas todavía.
- **Archivos probables:**
  - `packages/graph-builder/src/*`;
  - `packages/graph-builder/test/*`;
  - `apps/cli/src/index.ts` si se expone el nuevo graph result;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - usar únicamente símbolos ya normalizados por `parser-core`;
  - mantener identidad estable por path/kind/name/rango;
  - preservar procedencia `static-analysis` o parser según corresponda;
  - no resolver referencias entre símbolos;
  - no ejecutar código del repositorio analizado.

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

Validación focalizada para el Commit 029:

```bash
pnpm --filter @codestellation/graph-builder typecheck
pnpm --filter @codestellation/cli typecheck
pnpm test -- packages/graph-builder/test/import-export-edges.test.ts apps/cli/test/index-local.test.ts
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
- Los contratos de parser core todavía no tienen adaptador directo desde `repository-scanner`; se mantienen estructurales dentro del pipeline CLI.
- El parser TypeScript solo parsea texto fuente provisto explícitamente; el CLI puede leerlo de forma opt-in para TypeScript/TSX candidato bajo límite de tamaño.
- El parser TypeScript no crea `Program`, no usa type checker y no resuelve imports contra archivos reales.
- El analizador estático clasifica module specifiers pero todavía no los resuelve contra filesystem, package manifests, tsconfig paths o aliases.
- El graph-builder crea nodos externos de package desde imports de paquetes/built-ins, pero esos nodos son inferencias `possible`, no dependencias declaradas ni verificadas.
- Los imports relativos, absolutos o desconocidos todavía no generan edges `imports`; se conservan como `unresolvedImportReferences`.
- El graph-builder todavía no crea nodos de símbolos, edges `declares`, `references`, `calls`, `depends-on` reales ni relaciones derivadas de contenido de manifests.
- El export CLI incluye metadata local serializable de la fuente; esto es esperado para uso local explícito, pero API/UI deberán aplicar política antes de exponer rutas sensibles.

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
- `apps/cli/src/index.ts`
- `apps/cli/test/index-local.test.ts`
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
- `packages/graph-builder/src/project-file-nodes.ts`
- `packages/graph-builder/src/package-dependency-edges.ts`
- `packages/graph-builder/src/import-export-edges.ts`
- `packages/graph-builder/test/project-file-nodes.test.ts`
- `packages/graph-builder/test/package-dependency-edges.test.ts`
- `packages/graph-builder/test/import-export-edges.test.ts`
