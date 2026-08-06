# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-05
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(repository-scanner): detect package manifests`
- **Número operativo:** Commit 020
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 4 en progreso con detección inicial de manifests de paquetes
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary not implemented yet

## 2. Objetivo actual

Convertir el resultado clasificado del scanner en una detección inicial de manifests de paquetes, usando únicamente metadata ya presente en el inventario y referencias de archivos candidatos. La detección reconoce `package.json` como manifest de paquete Node sin leer contenido completo, interpretar dependencias, resolver workspaces, inferir stack completo, invocar parsers ni construir nodos o relaciones del grafo.

## 3. Último commit completado

- **Commit:** `feat(repository-scanner): detect package manifests`
- **Paquete principal:** `packages/repository-scanner`.
- **Archivo principal nuevo:** `packages/repository-scanner/src/package-manifest.ts`.
- **Entrada:** `RepositoryScanResult` producido por la clasificación inicial del scanner.
- **Función pública nueva:** `detectPackageManifestsFromScanResult`, con alias `detectPackageManifests`.
- **Contrato nuevo:** `RepositoryPackageManifestDetectionResult`, serializable y versionado.
- **Manifest soportado en MVP 1:** `package.json`, detectado como ecosistema `node` por método `metadata-path`.
- **Raíz de paquete:** los manifests en la raíz del repositorio omiten `packageRootPath`; los manifests anidados exponen el directorio relativo como `packageRootPath`.
- **Candidatos:** solo se inspeccionan archivos presentes en `sourceScan.candidateFiles` y cuyo inventario conserve `kind: "manifest"`.
- **Unsupported:** los manifest candidates que no sean `package.json` se reportan como warning `REPOSITORY_SCAN_UNSUPPORTED_PACKAGE_MANIFEST`.
- **Failure safe:** si el scan clasificado de origen está `failed`, la detección no intenta derivar manifests y devuelve error `REPOSITORY_SCAN_PACKAGE_MANIFEST_DETECTION_SKIPPED`.
- **Determinismo:** el serializer ordena manifests e issues, valida paths, valida que todo manifest detectado sea candidato del scan fuente y verifica conteos de resumen.
- **Pruebas:** se agregó `packages/repository-scanner/test/package-manifest.test.ts` para manifests raíz/anidados, candidatos unsupported, ignorados vendored, scans parciales/fallidos y validación del serializer.
- **Limitación principal:** todavía no se lee `package.json`, no se extraen `name`, `version`, scripts, dependencias ni workspaces, y no se deriva un resumen estructural del repositorio.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(repository-scanner): derive repository structure summary`
- **Objetivo:** resumir estructura de repositorio desde inventario, clasificación y manifests detectados, sin leer contenido completo ni construir nodos del grafo.
- **Archivos probables:**
  - `packages/repository-scanner/src/repository-structure.ts`;
  - `packages/repository-scanner/src/package-manifest.ts` si se necesita exponer metadata auxiliar mínima;
  - `packages/repository-scanner/src/index.ts`;
  - `packages/repository-scanner/test/repository-structure.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - consumir el resultado clasificado y la detección de manifests;
  - reportar conteos y directorios principales de forma determinística;
  - diferenciar raíz, paquetes anidados y carpetas relevantes;
  - no leer contenido de archivos;
  - no resolver workspaces ni dependencias todavía;
  - no construir nodos ni edges reales del grafo.

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

Validación focalizada para el Commit 020:

```bash
pnpm --filter @codestellation/repository-scanner typecheck
pnpm test -- packages/repository-scanner/test/scan-result.test.ts packages/repository-scanner/test/file-classifier.test.ts packages/repository-scanner/test/package-manifest.test.ts
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
- `packages/repository-scanner/test/scan-result.test.ts`
- `packages/repository-scanner/test/file-classifier.test.ts`
- `packages/repository-scanner/test/package-manifest.test.ts`
