# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(cli): index local folder and export graph json`
- **Número operativo:** Commit 027
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 7 con primer flujo CLI end-to-end metadata-only
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static import/export analyzer active; graph builder project/folder/file/package node generation active; metadata-only contains edges active; CLI local folder graph JSON export active

## 2. Objetivo actual

Crear el primer flujo CLI mínimo para indexar una carpeta local explícita y exportar un JSON serializable del grafo. El flujo encadena ingesta local, scanner, detección de manifests, resumen estructural y graph-builder metadata-only. Este commit no lee contenido completo de archivos fuera del inventario soportado, no interpreta `package.json`, no resuelve imports/exports, no crea símbolos, no calcula dependencias reales y no ejecuta código del repositorio analizado.

## 3. Último commit completado

- **Commit:** `feat(cli): index local folder and export graph json`
- **App principal:** `apps/cli`.
- **Archivo principal actualizado:** `apps/cli/src/index.ts`.
- **Comando:** `codestellation index-local <path> --out <graph.json> [--pretty]`.
- **Entrada soportada:** ruta local explícita compatible con `LocalFolderSourceInput`.
- **Salida:** export JSON versionado con `GraphBuilderPackageDependencyGraphResult`, resumen de conteos, fecha de generación e input normalizado.
- **Pipeline:** `resolveLocalFolderSource` → `createNormalizedSourceFileInventory` → `classifyRepositoryScanInput` → `detectPackageManifests` → `deriveRepositoryStructureSummary` → `buildProjectFileGraphFromRepositoryStructure` → `buildPackageDependencyGraphFromProjectFileGraph`.
- **Opciones CLI:** `--out`, `--pretty`, `--include`, `--exclude`, `--max-files` y `--max-file-size-bytes`.
- **Modo seguro:** preserva `followSymlinks: false`, `executeRepositoryCode: false` y Git history `metadata-only`; no ejecuta scripts ni código del repositorio analizado.
- **Compatibilidad de typecheck:** `@codestellation/source-ingestion` expone tipos desde `src` para que `apps/cli` no requiera `dist` previo durante `typecheck`.
- **Pruebas:** se agregó `apps/cli/test/index-local.test.ts` para parsing de argumentos, export serializable, JSON compacto/pretty, escritura con `--out` y errores claros.
- **Limitación principal:** el CLI aún no lee contenido fuente para alimentar parsers, no exporta snapshots incrementales, no integra `analyzer-static` al graph-builder y no tiene comandos para ZIP/Git/API/UI.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(cli): add safe source text parsing pipeline`
- **Objetivo:** agregar una etapa CLI controlada que lea únicamente contenido de archivos candidatos TypeScript/TSX dentro de límites explícitos para alimentar `parser-typescript` y preparar relaciones imports/exports, sin ejecutar código ni resolver módulos todavía.
- **Archivos probables:**
  - `apps/cli/src/index.ts` o nuevo módulo de pipeline;
  - `apps/cli/test/index-local.test.ts` o prueba nueva focalizada;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - leer solo archivos candidatos permitidos por scanner y límites de tamaño;
  - alimentar `parser-typescript` con `sourceText` explícito;
  - mantener salida determinística y serializable;
  - no ejecutar scripts ni importar módulos del repositorio analizado;
  - no resolver imports todavía contra filesystem/package manifests.

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

Validación focalizada para el Commit 027:

```bash
pnpm --filter @codestellation/cli typecheck
pnpm test -- apps/cli/test/index-local.test.ts
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
- El graph-builder crea nodos de paquete y edges `contains`, pero todavía no crea nodos de símbolos, edges `imports`/`exports`, edges `depends-on` reales ni relaciones derivadas de contenido de manifests.
- El export CLI incluye metadata local serializable de la fuente; esto es esperado para uso local explícito, pero API/UI deberán aplicar política antes de exponer rutas sensibles.
- El primer flujo CLI exporta el grafo metadata-only; todavía no incluye análisis por contenido fuente ni relaciones derivadas de parser/analyzer.

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
- `packages/graph-builder/test/project-file-nodes.test.ts`
- `packages/graph-builder/test/package-dependency-edges.test.ts`
