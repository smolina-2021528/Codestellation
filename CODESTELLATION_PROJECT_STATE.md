# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-05
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(source-ingestion): define local source input contracts`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 3 iniciada; contratos de entrada de fuentes definidos
- **Estado general:** stable scaffolding; quality, testing, CI, core contracts, graph model and source input contracts active

## 2. Objetivo actual

Comenzar la ingesta segura sin ejecutar todavía ingesta real. El proyecto ya cuenta con contratos versionados para describir carpeta local, ZIP y repositorio Git público antes de resolver rutas reales, extraer archivos, clonar repositorios, escanear contenido o construir grafo.

## 3. Último commit completado

- **Commit:** `feat(source-ingestion): define local source input contracts`
- **Resultado:** se agregaron contratos de entrada en `@codestellation/source-ingestion`.
- **Paquete principal:** `packages/source-ingestion`.
- **Archivo principal:** `packages/source-ingestion/src/input.ts`.
- **Versión de esquema:** `SOURCE_INPUT_SCHEMA_VERSION = 1`.
- **Fuentes soportadas contractualmente:** `local-folder`, `zip-archive` y `git-repository`.
- **Rutas locales:** se normalizan a separador `/`, se rechazan URLs, raíz de filesystem, traversal y caracteres de control.
- **ZIP:** se modela `archivePath` local y `entryRoot` opcional sin extraer ni leer el archivo.
- **Git:** se modela `repositoryUrl` HTTPS público, `ref` opcional y `depth` opcional sin clonar ni ejecutar hooks.
- **Opciones seguras por defecto:** `followSymlinks: false`, `executeRepositoryCode: false`, `includeGitHistory: metadata-only`, excludes comunes y límites máximos de archivos/tamaño.
- **Validación:** `validateSourceInput`, `assertSourceInput`, `isSourceInput` y helpers de parsing/guards para rutas, URLs, refs y glob patterns.
- **Serialización:** `toSerializableSourceInput` normaliza display name, patrones, límites y opciones para persistencia o API futura.
- **Pruebas:** se agregaron pruebas de contratos para carpetas locales, ZIP, Git, defaults de seguridad, guards y payloads inválidos.
- **Limitaciones:** todavía no hay resolución real de carpetas locales, workspace temporal para ZIP, clone Git, scanner, parser, graph builder, persistencia ni CLI funcional.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(source-ingestion): resolve local folder sources`
- **Objetivo:** convertir una entrada `local-folder` ya validada en una fuente local resuelta contra el filesystem sin escanear archivos todavía.
- **Archivos o paquetes probables:**
  - `packages/source-ingestion/src/local-folder.ts`;
  - `packages/source-ingestion/src/input.ts`;
  - `packages/source-ingestion/src/index.ts`;
  - `packages/source-ingestion/test/local-folder.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - usar APIs de filesystem en modo solo lectura;
  - resolver path absoluto y path real;
  - confirmar que existe y es directorio;
  - devolver metadata serializable de fuente resuelta;
  - no seguir symlinks fuera de alcance;
  - no escanear contenido ni construir nodos del grafo.

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
pnpm test -- packages/source-ingestion/test/input.test.ts
```

## 7. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.
- La validación de snapshots completos todavía no impone reglas semánticas avanzadas, como que todo edge `contains` coincida con `parentId`; eso queda para el builder o reglas de análisis posteriores.
- La metadata de procedencia y confianza ya es obligatoria para nodos y edges, por lo que los próximos builders deberán crear evidencia desde el primer momento.
- Los contratos de source ingestion validan forma, seguridad base y serialización, pero no sustituyen la validación real de filesystem, ZIP o Git que inicia en los siguientes commits.

## 8. Archivos clave actuales

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
