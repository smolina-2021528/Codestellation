# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-builder): create package and dependency edges`
- **Número operativo:** Commit 026
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 6 con graph-builder de nodos paquete y edges estructurales iniciales
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static import/export analyzer active; graph builder project/folder/file/package node generation active; metadata-only contains edges active

## 2. Objetivo actual

Extender `@codestellation/graph-builder` para crear nodos `package` y relaciones iniciales desde manifests detectados, usando solamente metadata del scanner y del grafo proyecto/carpeta/archivo. Este commit no lee contenido completo de manifests, no interpreta campos de `package.json`, no resuelve imports/exports, no crea símbolos, no calcula dependencias semánticas reales y no ejecuta código del repositorio analizado.

## 3. Último commit completado

- **Commit:** `feat(graph-builder): create package and dependency edges`
- **Paquete principal:** `packages/graph-builder`.
- **Archivo principal nuevo:** `packages/graph-builder/src/package-dependency-edges.ts`.
- **Export público actualizado:** `packages/graph-builder/src/index.ts`.
- **Entrada soportada:** `GraphBuilderProjectFileGraphResult` generado desde `RepositoryStructureSummaryResult`.
- **Salida:** `GraphBuilderPackageDependencyGraphResult` serializable con snapshot canónico, nodos de proyecto/carpeta/archivo/paquete, edges `contains`, diagnósticos derivados y summary consistente.
- **Nodos package:** se crean desde `RepositoryStructurePackageRootSummary`; el root package usa el nombre del proyecto y los paquetes anidados usan el basename del package root.
- **Package manager:** se infiere de lockfiles directos del package root (`pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `bun.lockb`, `package-lock.json`, `npm-shrinkwrap.json`) sin leer contenido de archivos.
- **Edges estructurales:** se crean edges `contains` para parentId jerárquico existente y edges paquete→manifest para cada manifest detectado.
- **Dependency edges:** el contrato expone `dependencyEdges`, pero el conteo permanece en cero mientras no se lea contenido de manifests ni se resuelvan dependencias reales.
- **Procedencia y confianza:** los nodos y edges nuevos incluyen confianza `confirmed` y procedencia `source-scan` con evidencia de manifest o parentId.
- **Snapshot:** se valida con `graph-model`; incluye nodos de proyecto/carpeta/archivo/paquete y edges `contains` determinísticos.
- **Modo seguro:** no se leen contenidos, no se resuelven imports, no se crean symbol nodes, no se crean edges `imports`/`exports`/`depends-on` reales y no se ejecuta código externo.
- **Pruebas:** se agregó `packages/graph-builder/test/package-dependency-edges.test.ts` para nodos de paquete, parentId, edges `contains`, inferencia de package manager y validación de contratos.
- **Limitación principal:** todavía no existe integración CLI end-to-end, lectura segura de contenido, parsing de manifests, resolución de workspaces/dependencias ni conexión entre analyzer-static y graph-builder.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(cli): index local folder and export graph json`
- **Objetivo:** crear un primer flujo CLI mínimo que encadene ingesta local, scanner y graph-builder para indexar una carpeta local y exportar un JSON del grafo, sin ejecutar código del repositorio analizado.
- **Archivos probables:**
  - `apps/cli/src/index.ts` o equivalente;
  - `apps/cli/package.json` si faltan dependencias internas;
  - pruebas focalizadas de CLI cuando el scaffold lo permita;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - aceptar una ruta local explícita;
  - usar las capas ya creadas en orden seguro;
  - exportar JSON serializable;
  - no leer contenido completo fuera de lo estrictamente soportado por ingesta/scanner actual;
  - no ejecutar scripts ni código del repositorio analizado;
  - mantener errores claros para entradas inválidas.

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

Validación focalizada para el Commit 026:

```bash
pnpm --filter @codestellation/graph-model typecheck
pnpm --filter @codestellation/repository-scanner typecheck
pnpm --filter @codestellation/graph-builder typecheck
pnpm test -- packages/graph-builder/test/project-file-nodes.test.ts packages/graph-builder/test/package-dependency-edges.test.ts
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
- `packages/graph-builder/src/project-file-nodes.ts`
- `packages/graph-builder/src/package-dependency-edges.ts`
- `packages/graph-builder/test/project-file-nodes.test.ts`
- `packages/graph-builder/test/package-dependency-edges.test.ts`
