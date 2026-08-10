# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(parser-core): define parser contracts`
- **Número operativo:** Commit 022
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 5 iniciada con contratos base de parser core
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript parser implementation not started yet

## 2. Objetivo actual

Definir los contratos base del parser core para que parsers específicos puedan recibir referencias parseables de archivos, registrar diagnósticos, reportar rangos de texto y devolver resultados normalizados por archivo y por lote. El commit no implementa parsing real, no lee contenido de archivos, no genera AST, no resuelve imports/exports, no extrae símbolos reales y no construye nodos ni relaciones del grafo.

## 3. Último commit completado

- **Commit:** `feat(parser-core): define parser contracts`
- **Paquete principal:** `packages/parser-core`.
- **Archivo principal nuevo:** `packages/parser-core/src/parser-result.ts`.
- **Export público actualizado:** `packages/parser-core/src/index.ts`.
- **Contratos nuevos:** referencias parseables de archivo, batch input, posiciones, rangos de texto, descriptor de parser, diagnósticos `PARSER_*`, registros normalizados de símbolos, imports, exports, referencias, resultado por archivo y resultado por lote.
- **Lenguajes iniciales:** `typescript`, `tsx`, `javascript`, `jsx`, `json` y `unknown`.
- **Roles de archivo:** `source`, `test`, `manifest`, `config`, `declaration` y `unknown`.
- **Estados:** `completed`, `partial`, `failed` y `skipped` para unidades y lotes de parsing.
- **Validación runtime:** paths relativos seguros, IDs de plugin kebab-case, códigos `PARSER_*`, extensiones simples, rangos ordenados, severidades, enums, conteos consistentes, unicidad de paths de lote y unicidad de `localId` de símbolos por archivo.
- **Serialización:** helpers determinísticos para batch inputs, resultados por archivo y resultados por lote, con orden estable de archivos, diagnósticos, símbolos, imports, exports y referencias.
- **Plugin host contract:** interfaz `ParserCoreLanguageParserPlugin` con `canParse`, `parse` y `getVersion` para parsers específicos.
- **Pruebas:** se agregó `packages/parser-core/test/parser-result.test.ts` para batch input, serialización de resultados, validaciones principales, guards/asserts y rechazo de inconsistencias.
- **Limitación principal:** los contratos son estructurales y no dependen del scanner para evitar que `typecheck` requiera artefactos `dist` de otros workspaces; la conversión desde resultados del scanner queda para un commit posterior cuando exista el flujo integrado.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(parser-typescript): parse TypeScript source files`
- **Objetivo:** implementar el primer parser específico sobre los contratos de `parser-core` para procesar archivos TypeScript/TSX controlados por el propio pipeline.
- **Archivos probables:**
  - `packages/parser-typescript/src/typescript-parser.ts` o equivalente;
  - `packages/parser-typescript/src/index.ts`;
  - `packages/parser-typescript/test/typescript-parser.test.ts`;
  - `packages/parser-typescript/package.json` si se requiere dependencia directa a `parser-core`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - implementar un parser TypeScript mínimo y determinístico;
  - producir `ParserCoreParseUnitResult` usando los contratos nuevos;
  - registrar diagnósticos recuperables cuando el archivo tenga errores;
  - cubrir fixture mínimo con símbolos/imports/exports básicos si el alcance lo permite;
  - no analizar relaciones estáticas profundas, no resolver módulos y no construir grafo todavía.

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

Validación focalizada para el Commit 022:

```bash
pnpm --filter @codestellation/parser-core typecheck
pnpm test -- packages/parser-core/test/parser-result.test.ts
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
- Los resultados del parser core modelan símbolos/imports/exports/referencias normalizados, pero todavía no garantizan procedencia del grafo ni resolución semántica.
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
