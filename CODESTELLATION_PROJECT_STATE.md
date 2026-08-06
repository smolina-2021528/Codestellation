# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-05
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(repository-scanner): classify inventory files`
- **Número operativo:** Commit 019
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 4 en progreso con clasificación inicial del scanner
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; manifest detection not implemented yet

## 2. Objetivo actual

Convertir el inventario normalizado de una fuente local en un resultado de scanner mínimo, válido y determinístico. El scanner clasifica cada archivo usando únicamente metadata ya presente en el inventario, sin leer contenido completo de archivos, calcular hashes, detectar paquetes, parsear TypeScript ni construir nodos o relaciones del grafo.

## 3. Último commit completado

- **Commit:** `feat(repository-scanner): classify inventory files`
- **Paquete principal:** `packages/repository-scanner`.
- **Archivo principal nuevo:** `packages/repository-scanner/src/file-classifier.ts`.
- **Contrato reutilizado:** `packages/repository-scanner/src/scan-result.ts` sigue siendo la fuente canónica de tipos, validadores, serializers y reglas de consistencia del resultado.
- **Funciones públicas nuevas:** `classifyRepositoryScanInput` y `classifyRepositoryScanInventory`.
- **Entrada:** inventario normalizado compatible con el contrato estructural serializable de `source-ingestion`.
- **Candidatos:** archivos con `kind` inicial `source`, `test`, `manifest` o `config`.
- **Ignorados:** documentación, assets, binarios, minificados, generados, vendored y archivos potencialmente sensibles, siempre con motivo visible (`unsupported-kind`, `binary`, `generated`, `vendored`, `minified` o `sensitive`) y mensaje seguro.
- **No clasificados:** archivos con `kind` `unknown`; el resultado queda `partial` si ya había al menos un archivo clasificado, o `failed` con error `REPOSITORY_SCAN_NO_CLASSIFIABLE_FILES` si ningún archivo pudo clasificarse.
- **Issues heredados:** warnings y errores del inventario de origen se preservan como issues `REPOSITORY_SCAN_SOURCE_INVENTORY_WARNING` o `REPOSITORY_SCAN_SOURCE_INVENTORY_ERROR`; si el path del issue no pertenece a `inventory.files`, el issue se conserva sin path para respetar el contrato del scan result.
- **Metadata:** el clasificador acepta timestamps opcionales para pruebas determinísticas y calcula `durationMs` sin depender del filesystem.
- **Determinismo:** el resultado final se normaliza mediante `toSerializableRepositoryScanResult`, que ordena referencias e issues y valida conteos.
- **Pruebas:** se agregó `packages/repository-scanner/test/file-classifier.test.ts` para candidatos, ignorados por metadata, binarios, sensibles, desconocidos, estados parciales/fallidos e issues heredados.
- **Limitación principal:** todavía no existe detección semántica de manifests ni resumen de estructura del repositorio; `package.json` solo es candidato porque el inventario ya lo marcó como `manifest`.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(repository-scanner): detect package manifests`
- **Objetivo:** detectar manifests de paquetes desde los archivos candidatos ya clasificados, comenzando por `package.json`, sin leer todavía dependencias completas ni construir grafo.
- **Archivos probables:**
  - `packages/repository-scanner/src/package-manifest.ts`;
  - `packages/repository-scanner/src/file-classifier.ts` si se necesita exponer metadata auxiliar mínima;
  - `packages/repository-scanner/src/index.ts`;
  - `packages/repository-scanner/test/package-manifest.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - consumir el resultado clasificado del scanner;
  - detectar manifests por path/nombre y metadata, no por lectura de contenido completo;
  - no interpretar dependencias todavía;
  - no resolver workspaces todavía;
  - no inferir stack completo todavía;
  - mantener resultados serializables, determinísticos y auditables.

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

Validación focalizada para el Commit 019:

```bash
pnpm --filter @codestellation/repository-scanner typecheck
pnpm test -- packages/repository-scanner/test/scan-result.test.ts packages/repository-scanner/test/file-classifier.test.ts
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
- Los motivos de archivos ignorados ya forman parte de un contrato versionado; cualquier cambio incompatible debe incrementar la versión correspondiente.
- El resultado del scanner conserva el inventario normalizado, incluyendo paths locales serializables; las capas de API y UI deberán evitar exponer rutas sensibles sin una política explícita.

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
- `packages/repository-scanner/test/scan-result.test.ts`
- `packages/repository-scanner/test/file-classifier.test.ts`
