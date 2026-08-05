# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-05
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(source-ingestion): resolve local folder sources`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 3 en progreso; resolución local de fuentes iniciada
- **Estado general:** stable scaffolding; quality, testing, CI, core contracts, graph model, source input contracts and local folder resolution active

## 2. Objetivo actual

Continuar la ingesta segura del MVP 1 sin ejecutar código del repositorio analizado. El proyecto ya puede tomar una entrada `local-folder` validada, resolverla contra el filesystem en modo solo lectura y devolver metadata serializable antes de escanear archivos, construir inventarios o generar nodos del grafo.

## 3. Último commit completado

- **Commit:** `feat(source-ingestion): resolve local folder sources`
- **Resultado:** se agregó resolución real de carpetas locales en `@codestellation/source-ingestion`.
- **Paquete principal:** `packages/source-ingestion`.
- **Archivo principal:** `packages/source-ingestion/src/local-folder.ts`.
- **Entrada requerida:** `LocalFolderSourceInput` ya validada o serializable mediante los contratos de `input.ts`.
- **Resolución:** convierte `path` relativo o absoluto en `absolutePath` normalizado y obtiene `realPath` mediante APIs nativas de Node.
- **Filesystem:** usa operaciones de solo lectura (`lstat` y `realpath`) para confirmar existencia y tipo de directorio.
- **Symlinks:** rechaza un symlink como raíz de la fuente local durante MVP 1.
- **Salida:** `ResolvedLocalFolderSource` versionado con `requestedPath`, `absolutePath`, `realPath`, `directoryName`, metadata de filesystem y opciones efectivas de escaneo/seguridad.
- **Errores:** `LocalFolderResolutionError` expone códigos estables para input inválido, ruta inexistente, ruta no directorio, symlink no permitido y fallo de realpath.
- **Pruebas:** se agregaron pruebas para resolución exitosa, rutas faltantes, rutas no directorio, symlinks y códigos de error.
- **Dependencias:** se agregó `@types/node` para tipar APIs nativas de filesystem, path, os y url sin introducir librerías de runtime.
- **Limitaciones:** todavía no hay inventario de archivos, filtros include/exclude aplicados sobre contenido, lectura de archivos, ZIP extraction, clone Git, scanner, parser, graph builder, persistencia ni CLI funcional.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(source-ingestion): create normalized source file inventory`
- **Objetivo:** recorrer una fuente local resuelta y crear un inventario normalizado de archivos fuente respetando límites de seguridad, excludes básicos y metadatos mínimos.
- **Archivos o paquetes probables:**
  - `packages/source-ingestion/src/file-inventory.ts`;
  - `packages/source-ingestion/src/local-folder.ts`;
  - `packages/source-ingestion/src/index.ts`;
  - `packages/source-ingestion/test/file-inventory.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - recorrer directorios en modo solo lectura;
  - ignorar directorios excluidos por defecto como `.git`, `node_modules`, `dist`, `coverage`, `.next`, `.turbo` y `out`;
  - no seguir symlinks;
  - producir paths relativos normalizados;
  - incluir tamaño y timestamps disponibles;
  - respetar `maxFiles` y `maxFileSizeBytes`;
  - no leer contenido completo de archivos ni construir nodos del grafo.

## 5. Punto de parada obligatorio del proyecto

Al completar el próximo commit `feat(source-ingestion): create normalized source file inventory`, detener la secuencia normal de commits y generar un documento descargable de continuación/migración.

- **Documento sugerido:** `CODESTELLATION_MVP1_CONTINUACION_POST_INGESTION.md`
- **Debe incluir:** último commit aplicado, estado real, comandos que pasan, pendientes exactos, riesgos y próximo commit recomendado.
- **Regla:** el documento debe entregarse como archivo descargable, no como bloque largo de código en el chat.

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
```

## 8. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.
- La validación de snapshots completos todavía no impone reglas semánticas avanzadas, como que todo edge `contains` coincida con `parentId`; eso queda para el builder o reglas de análisis posteriores.
- La metadata de procedencia y confianza ya es obligatoria para nodos y edges, por lo que los próximos builders deberán crear evidencia desde el primer momento.
- El resolver local confirma el directorio raíz, pero todavía no aplica filtros de inventario ni detecta archivos relevantes.
- Los tests de symlinks pueden depender de permisos del sistema operativo; la suite los maneja sin asumir que Windows permita crear symlinks en todos los entornos.

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
