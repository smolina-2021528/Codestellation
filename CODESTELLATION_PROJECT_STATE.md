# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-05
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(repository-scanner): derive repository structure summary`
- **Número operativo:** Commit 021
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 4 en progreso con resumen estructural metadata-only del repositorio
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser contracts not implemented yet

## 2. Objetivo actual

Derivar un resumen estructural inicial del repositorio desde el resultado clasificado del scanner y la detección de manifests de paquetes. El resumen usa únicamente metadata disponible del inventario, referencias de candidatos/ignorados y manifests detectados; no lee contenido completo, no interpreta `package.json`, no resuelve workspaces, no infiere dependencias, no invoca parsers y no construye nodos ni relaciones reales del grafo.

## 3. Último commit completado

- **Commit:** `feat(repository-scanner): derive repository structure summary`
- **Paquete principal:** `packages/repository-scanner`.
- **Archivo principal nuevo:** `packages/repository-scanner/src/repository-structure.ts`.
- **Entrada:** `RepositoryPackageManifestDetectionResult` producido por la detección metadata-only de manifests.
- **Función pública nueva:** `deriveRepositoryStructureFromPackageManifestDetection`, con alias `deriveRepositoryStructureSummary`.
- **Contrato nuevo:** `RepositoryStructureSummaryResult`, serializable y versionado.
- **Resumen de repositorio:** expone conteos de archivos raíz, directorios top-level, profundidad máxima y tamaño total.
- **Directorios top-level:** reporta conteos de archivos, candidatos, ignorados, manifests, paquetes anidados, tamaño total y roles determinísticos como `package-container`, `source-container`, `test-container`, `configuration`, `documentation` y `asset`.
- **Package roots:** diferencia paquete raíz y paquetes anidados, conserva `manifestPath`, `packageRootPath` cuando aplica, ecosistema y conteos por tipo de archivo dentro del scope del paquete.
- **Estados:** conserva `completed`, `partial` y `failed`; si la detección de manifests falla, el resumen estructural se omite con error `REPOSITORY_SCAN_STRUCTURE_SUMMARY_SKIPPED`.
- **Issues:** preserva warnings/errores del scan fuente y de la detección de manifests dentro del resumen estructural.
- **Determinismo:** el serializer ordena directorios, paquetes e issues; valida paths, roles, package roots y todos los conteos derivados.
- **Pruebas:** se agregó `packages/repository-scanner/test/repository-structure.test.ts` para derivación principal, estado parcial, failure safe, orden determinístico y rechazo de conteos inconsistentes.
- **Limitación principal:** todavía no se lee `package.json`, no se extraen `name`, `version`, scripts, dependencias ni workspaces, no se infieren lenguajes/stacks, no se parsea TypeScript y no se construye grafo.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(parser-core): define parser contracts`
- **Objetivo:** iniciar los contratos del parser core para representar entradas de parseo, resultados, diagnósticos, unidades parseables y metadatos necesarios para parsers específicos.
- **Archivos probables:**
  - `packages/parser-core/src/parser-result.ts` o contrato equivalente;
  - `packages/parser-core/src/index.ts`;
  - `packages/parser-core/test/parser-result.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - definir contratos sin implementar parser TypeScript todavía;
  - consumir referencias de archivos candidatos del scanner como entradas futuras, no contenido completo;
  - modelar resultados serializables, diagnósticos y estados;
  - preparar el terreno para `feat(parser-typescript): parse TypeScript source files`;
  - no analizar imports/exports, símbolos ni construir nodos del grafo.

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

Validación focalizada para el Commit 021:

```bash
pnpm --filter @codestellation/repository-scanner typecheck
pnpm test -- packages/repository-scanner/test/scan-result.test.ts packages/repository-scanner/test/file-classifier.test.ts packages/repository-scanner/test/package-manifest.test.ts packages/repository-scanner/test/repository-structure.test.ts
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
- `packages/repository-scanner/test/scan-result.test.ts`
- `packages/repository-scanner/test/file-classifier.test.ts`
- `packages/repository-scanner/test/package-manifest.test.ts`
- `packages/repository-scanner/test/repository-structure.test.ts`
