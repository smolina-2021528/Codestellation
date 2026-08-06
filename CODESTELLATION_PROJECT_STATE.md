# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-05
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(repository-scanner): define scan result contracts`
- **Número operativo:** Commit 018
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 4 iniciada con contratos del scanner
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan input and result contracts active; file classification not implemented yet

## 2. Objetivo actual

Establecer el límite público de `@codestellation/repository-scanner` antes de incorporar lógica funcional. El paquete ya puede representar y validar de forma serializable una entrada compatible con el inventario normalizado de `source-ingestion` y el resultado esperado de un escaneo, sin leer contenido de archivos, detectar manifests, ejecutar parsers ni construir el grafo.

## 3. Último commit completado

- **Commit:** `feat(repository-scanner): define scan result contracts`
- **Paquete principal:** `packages/repository-scanner`.
- **Archivo principal:** `packages/repository-scanner/src/scan-result.ts`.
- **Entrada:** `RepositoryScanInput` versionado que contiene un inventario normalizado compatible con el contrato serializable de `source-ingestion`.
- **Estados:** `completed`, `partial` y `failed` con reglas de consistencia explícitas.
- **Archivos candidatos:** referencias versionadas por path relativo normalizado del inventario.
- **Archivos ignorados:** referencias versionadas con motivo visible (`unsupported-kind`, `binary`, `generated`, `vendored`, `minified`, `sensitive` o `policy`) y mensaje seguro.
- **Advertencias y errores:** colecciones separadas con códigos estables bajo el prefijo `REPOSITORY_SCAN_*`; los errores declaran `retryable`.
- **Metadata:** timestamps de inicio y finalización, duración y resumen de archivos candidatos, ignorados, no clasificados, warnings y errores.
- **Validación:** los serializers verifican versiones, rutas existentes en el inventario, duplicados, conflictos de disposición, conteos, timestamps, estados y consistencia básica del inventario de origen.
- **Determinismo:** referencias e issues se serializan en orden estable.
- **Dependencia interna:** `@codestellation/repository-scanner` no agrega dependencias internas en este commit; conserva compatibilidad estructural con el inventario normalizado para evitar depender de artefactos `dist` de otro workspace durante `typecheck`.
- **Pruebas:** se agregó `packages/repository-scanner/test/scan-result.test.ts` para contratos, guards, serialización y rechazos de estados inconsistentes.
- **Limitación principal:** todavía no existe una función que clasifique archivos o produzca automáticamente un `RepositoryScanResult`.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(repository-scanner): classify inventory files`
- **Objetivo:** implementar una clasificación determinística y pura de cada entrada de `SourceFileInventory` como candidata, ignorada o no clasificada.
- **Archivos probables:**
  - `packages/repository-scanner/src/file-classifier.ts`;
  - `packages/repository-scanner/src/index.ts`;
  - `packages/repository-scanner/test/file-classifier.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - consumir únicamente metadata ya disponible en el inventario;
  - no leer contenido completo de archivos;
  - no calcular hashes;
  - no detectar todavía manifests ni paquetes;
  - no parsear TypeScript;
  - producir un `RepositoryScanResult` válido y determinístico;
  - mantener visibles los motivos de exclusión y las advertencias heredadas del inventario.

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

Validación focalizada para el Commit 018:

```bash
pnpm --filter @codestellation/repository-scanner typecheck
pnpm test -- packages/repository-scanner/test/scan-result.test.ts
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
- `packages/repository-scanner/test/scan-result.test.ts`
