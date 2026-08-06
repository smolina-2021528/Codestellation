# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-05
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(source-ingestion): create normalized source file inventory`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 3 completada para ingesta local inicial
- **Estado general:** stable scaffolding; quality, testing, CI, core contracts, graph model, source input contracts, local folder resolution and normalized local file inventory active

## 2. Objetivo actual

Cerrar el primer bloque de ingesta segura del MVP 1. El proyecto ya puede validar una entrada `local-folder`, resolverla contra el filesystem en modo solo lectura y crear un inventario normalizado de archivos sin leer contenido completo, sin seguir symlinks y sin ejecutar código del repositorio analizado.

## 3. Último commit completado

- **Commit:** `feat(source-ingestion): create normalized source file inventory`
- **Resultado:** se agregó inventario normalizado de archivos para carpetas locales resueltas en `@codestellation/source-ingestion`.
- **Paquete principal:** `packages/source-ingestion`.
- **Archivo principal:** `packages/source-ingestion/src/file-inventory.ts`.
- **Entrada requerida:** `ResolvedLocalFolderSource` producido por `resolveLocalFolderSource`.
- **Recorrido:** usa operaciones de solo lectura (`readdir` y `lstat`) para recorrer directorios y metadatos de entradas.
- **Seguridad:** no sigue symlinks y registra advertencias cuando encuentra enlaces simbólicos dentro de la fuente.
- **Filtros:** aplica patrones `include` y `exclude` de las opciones serializadas, incluyendo los excludes por defecto `.git/**`, `node_modules/**`, `dist/**`, `coverage/**`, `.next/**`, `.turbo/**` y `out/**`.
- **Límites:** respeta `maxFileSizeBytes` excluyendo archivos grandes y `maxFiles` fallando de forma explícita si se supera el límite.
- **Salida:** `SourceFileInventory` versionado con raíz, opciones efectivas, archivos ordenados, issues y resumen de conteos.
- **Archivos:** cada entrada tiene path relativo normalizado, tamaño, `modifiedAt`, `createdAt` cuando está disponible, extensión y clasificación inicial (`source`, `test`, `manifest`, `config`, `documentation`, `asset`, `unknown`).
- **Pruebas:** se agregaron pruebas para inventario determinístico, excludes por defecto, include/exclude personalizados, límite de tamaño, symlinks, `maxFiles` y guards.
- **Limitaciones:** todavía no hay lectura de contenido completo, hash de archivos, ZIP extraction, clone Git, scanner semántico, parser TypeScript, graph builder, persistencia, API, web ni CLI funcional.

## 4. Punto de parada obligatorio del proyecto

Este punto de parada ya fue alcanzado después de completar `feat(source-ingestion): create normalized source file inventory`.

- **Documento requerido:** `CODESTELLATION_MVP1_CONTINUACION_POST_INGESTION.md`
- **Debe entregarse como:** archivo descargable separado, no como bloque largo de código en el chat.
- **Contenido mínimo:** último commit aplicado, estado real, comandos que pasan, pendientes exactos, riesgos y próximo commit recomendado.
- **Regla:** no continuar con nuevos commits funcionales hasta dejar este documento generado y disponible.

## 5. Próximo commit recomendado después del documento de continuación

- **Commit sugerido:** `feat(repository-scanner): define scan result contracts`
- **Objetivo:** iniciar el paquete `@codestellation/repository-scanner` definiendo contratos de entrada y salida para consumir inventarios normalizados sin parsear todavía TypeScript ni construir el grafo.
- **Archivos o paquetes probables:**
  - `packages/repository-scanner/src/index.ts`;
  - `packages/repository-scanner/src/scan-result.ts`;
  - `packages/repository-scanner/test/scan-result.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - aceptar un `SourceFileInventory` como entrada conceptual;
  - definir estados de scan y metadatos serializables;
  - separar errores, advertencias y archivos candidatos;
  - no leer todavía contenido completo de archivos;
  - no depender de parser, graph-builder, store, API ni web.

## 6. Reglas activas para los próximos commits

- Entregar únicamente archivos nuevos o modificados, no el proyecto completo.
- No entregar patches salvo solicitud explícita.
- Mantener commits pequeños, atómicos y verificables.
- Actualizar este documento al terminar cada commit.
- Mantener `README.md` sincronizado solo cuando cambien comandos, estado o navegación principal.
- Ejecutar o documentar las validaciones relevantes en cada entrega.
- No introducir dependencias externas sin una razón vinculada al commit.
- Evitar lógica funcional fuera del alcance exacto del commit.
- Preservar operación local-first y no ejecutar código de repositorios analizados.

## 7. Comandos de validación vigentes

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm run ci:check
```

En CI se ejecuta la secuencia remota mínima:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para este commit también es útil validar de forma focalizada:

```bash
pnpm --filter @codestellation/source-ingestion typecheck
pnpm test -- packages/source-ingestion/test/local-folder.test.ts
pnpm test -- packages/source-ingestion/test/file-inventory.test.ts
```

## 8. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.
- La validación de snapshots completos todavía no impone reglas semánticas avanzadas, como que todo edge `contains` coincida con `parentId`; eso queda para el builder o reglas de análisis posteriores.
- La metadata de procedencia y confianza ya es obligatoria para nodos y edges, por lo que los próximos builders deberán crear evidencia desde el primer momento.
- El matcher de globs de inventario cubre los patrones iniciales del MVP 1, pero no pretende ser un reemplazo completo de minimatch.
- Los tests de symlinks pueden depender de permisos del sistema operativo; la suite los maneja sin asumir que Windows permita crear symlinks en todos los entornos.
- El inventario no calcula hash de archivos todavía; eso debe decidirse al iniciar scanner o snapshots incrementales.

## 9. Archivos clave actuales

- `README.md`
- `CODESTELLATION_DECISIONS.md`
- `CODESTELLATION_PROJECT_STATE.md`
- `.github/workflows/ci.yml`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `vitest.config.ts`
- `.editorconfig`
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
