# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-builder): create project folder and file nodes`
- **Número operativo:** Commit 025
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 6 con graph-builder inicial de nodos proyecto/carpeta/archivo
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static import/export analyzer active; graph builder project/folder/file node generation active

## 2. Objetivo actual

Iniciar `@codestellation/graph-builder` creando un primer resultado de grafo canónico con nodos de proyecto, carpetas y archivos a partir del resumen estructural del scanner. Este commit no crea nodos de paquete, símbolos ni relaciones; no conecta imports/exports; no resuelve módulos; no lee contenido de archivos; y no ejecuta código del repositorio analizado.

## 3. Último commit completado

- **Commit:** `feat(graph-builder): create project folder and file nodes`
- **Paquete principal:** `packages/graph-builder`.
- **Archivo principal nuevo:** `packages/graph-builder/src/project-file-nodes.ts`.
- **Export público actualizado:** `packages/graph-builder/src/index.ts`.
- **Dependencias declaradas:** `@codestellation/graph-model` y `@codestellation/repository-scanner` como workspace dependencies.
- **Entrada soportada:** `RepositoryStructureSummaryResult` generado por el scanner de repositorios.
- **Salida:** `GraphBuilderProjectFileGraphResult` serializable con snapshot canónico, nodo de proyecto, nodos de carpeta, nodos de archivo, diagnósticos derivados y summary consistente.
- **Proyecto:** se crea un único nodo `project` raíz con ID estable `node:project/root` y nombre derivado de metadata del inventario cuando existe.
- **Carpetas:** se crean nodos `folder` para todos los directorios y ancestros presentes en las rutas del inventario, no solo directorios top-level. Cada carpeta conserva parentId jerárquico, path relativo, conteos y tags de rol derivados por metadata.
- **Archivos:** se crean nodos `file` para los archivos del inventario con path relativo, lenguaje inferido por extensión, extensión normalizada, disposición de scan (`candidate`, `ignored` o `unclassified`) y motivo de ignorado cuando aplica.
- **Identidad:** los IDs de carpetas y archivos son determinísticos, seguros para `graph-model` y codifican caracteres válidos en paths pero inválidos para tokens de IDs.
- **Procedencia y confianza:** todos los nodos incluyen confianza `confirmed` y procedencia `source-scan` con evidencia del resumen estructural o path de inventario.
- **Snapshot:** se valida con `graph-model`; incluye nodos de proyecto/carpeta/archivo y cero edges.
- **Modo seguro:** no se leen contenidos, no se resuelven imports, no se crean package nodes, no se crean symbol nodes, no se crean edges y no se ejecuta código externo.
- **Pruebas:** se agregó `packages/graph-builder/test/project-file-nodes.test.ts` para snapshot determinístico, jerarquía de parents, archivos ignorados, codificación de IDs y validación de contratos.
- **Soporte de typecheck:** `graph-model`, `repository-scanner` y `graph-builder` exponen tipos desde `src/index.ts` para evitar depender de `dist` previo durante `pnpm typecheck`.
- **Limitación principal:** todavía no hay nodos de paquete, edges `contains`, edges de dependencias, edges imports/exports ni integración end-to-end desde CLI.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(graph-builder): create package and dependency edges`
- **Objetivo:** extender `@codestellation/graph-builder` para crear nodos `package` y relaciones iniciales desde manifests detectados, sin resolver imports/exports todavía.
- **Archivos probables:**
  - `packages/graph-builder/src/package-nodes.ts` o equivalente;
  - `packages/graph-builder/src/index.ts`;
  - `packages/graph-builder/test/package-nodes.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - crear nodos `package` compatibles con `graph-model`;
  - relacionar proyecto, carpetas, archivos y paquetes de forma explícita cuando corresponda;
  - preservar procedencia/confianza obligatoria;
  - mantener salida determinística y serializable;
  - no resolver imports/exports ni dependencias semánticas todavía;
  - no leer contenido completo de manifests.

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

Validación focalizada para el Commit 025:

```bash
pnpm --filter @codestellation/graph-model typecheck
pnpm --filter @codestellation/repository-scanner typecheck
pnpm --filter @codestellation/graph-builder typecheck
pnpm test -- packages/graph-builder/test/project-file-nodes.test.ts
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
- El graph-builder inicial crea nodos de proyecto, carpetas y archivos, pero todavía no crea nodos de paquete, símbolos, edges `contains`, edges de dependencias ni relaciones de imports/exports.
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
- `packages/graph-builder/test/project-file-nodes.test.ts`
