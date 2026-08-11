# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(cli): add safe source text parsing pipeline`
- **Número operativo:** Commit 028
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 7 con flujo CLI end-to-end y parseo source-text opt-in
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static import/export analyzer active; graph builder project/folder/file/package node generation active; metadata-only contains edges active; CLI local folder graph JSON export active; safe CLI source text parsing pipeline active

## 2. Objetivo actual

Agregar una etapa CLI opt-in para leer contenido fuente de forma controlada, alimentar el parser TypeScript/TSX y adjuntar análisis estático de imports/exports al JSON exportado. El flujo sigue sin ejecutar código, sin interpretar `package.json`, sin resolver imports contra filesystem y sin modificar el grafo con símbolos o relaciones derivadas de contenido.

## 3. Último commit completado

- **Commit:** `feat(cli): add safe source text parsing pipeline`
- **App principal:** `apps/cli`.
- **Archivo principal actualizado:** `apps/cli/src/index.ts`.
- **Comando base:** `codestellation index-local <path> --out <graph.json> [--pretty]`.
- **Nueva opción:** `--parse-source-text` habilita lectura explícita de archivos candidatos TypeScript/TSX.
- **Nuevo límite:** `--max-source-text-bytes <n>` define el máximo por archivo; el valor por defecto es 512 KiB.
- **Salida adicional:** cuando la opción está activa, el JSON incluye `sourceTextParsing` con `ParserCoreParseBatchResult`, `AnalyzerStaticImportExportAnalysisResult` y resumen de archivos parseados, omitidos, símbolos, imports, exports y diagnósticos.
- **Pipeline agregado:** inventario/scan/grafo metadata-only → selección de candidatos TypeScript/TSX → lectura UTF-8 bajo límite → `parseTypeScriptSourceText` → `analyzeStaticImportsAndExports`.
- **Modo seguro:** solo lee paths del inventario candidato, valida que la ruta resuelta permanezca dentro del root real, respeta límites de tamaño y no ejecuta scripts ni importa módulos del repositorio analizado.
- **Pruebas:** `apps/cli/test/index-local.test.ts` ahora cubre parsing de argumentos, export sin lectura de contenido, parseo opt-in, límite de tamaño, JSON compacto/pretty, escritura con `--out` y errores claros.
- **Limitación principal:** el resultado de parser/analyzer aún no se integra al `graph-builder`; todavía no existen nodos de símbolos ni edges `imports`/`exports` en el grafo.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(graph-builder): create import export edges from static analysis`
- **Objetivo:** consumir el resultado de `analyzer-static` para preparar relaciones de imports/exports en el grafo canónico, sin resolver módulos todavía y sin crear dependencias package-level reales.
- **Archivos probables:**
  - `packages/graph-builder/src/*`;
  - `packages/graph-builder/test/*`;
  - `apps/cli/src/index.ts` si se expone el nuevo graph result;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - usar únicamente imports/exports ya normalizados por `analyzer-static`;
  - mantener trazabilidad/procedencia hacia parser/analyzer;
  - no resolver module specifiers contra disco, tsconfig paths o manifests;
  - no ejecutar código del repositorio analizado;
  - mantener salida serializable y determinística.

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

Validación focalizada para el Commit 028:

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
- El parser TypeScript solo parsea texto fuente provisto explícitamente; el CLI ya puede leerlo de forma opt-in para TypeScript/TSX candidato bajo límite de tamaño.
- El parser TypeScript no crea `Program`, no usa type checker y no resuelve imports contra archivos reales.
- El analizador estático clasifica module specifiers pero todavía no los resuelve contra filesystem, package manifests, tsconfig paths o aliases.
- El graph-builder crea nodos de paquete y edges `contains`, pero todavía no crea nodos de símbolos, edges `imports`/`exports`, edges `depends-on` reales ni relaciones derivadas de contenido de manifests.
- El export CLI incluye metadata local serializable de la fuente; esto es esperado para uso local explícito, pero API/UI deberán aplicar política antes de exponer rutas sensibles.
- El flujo CLI puede adjuntar análisis por contenido fuente, pero el grafo exportado todavía no incluye relaciones derivadas de parser/analyzer.

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
