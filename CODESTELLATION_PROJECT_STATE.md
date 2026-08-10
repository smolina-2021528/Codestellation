# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-10
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(parser-typescript): parse TypeScript source files`
- **Número operativo:** Commit 023
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 5 con primer parser TypeScript funcional sobre contratos de parser core
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static analyzer not started yet

## 2. Objetivo actual

Implementar el primer parser específico de Codestellation para TypeScript/TSX usando los contratos de `@codestellation/parser-core`. El parser opera sobre texto fuente provisto por el pipeline local, no lee archivos por cuenta propia, no ejecuta código del repositorio analizado, no resuelve módulos, no crea un programa semántico de TypeScript y no construye nodos ni relaciones del grafo.

## 3. Último commit completado

- **Commit:** `feat(parser-typescript): parse TypeScript source files`
- **Paquete principal:** `packages/parser-typescript`.
- **Archivo principal nuevo:** `packages/parser-typescript/src/typescript-parser.ts`.
- **Export público actualizado:** `packages/parser-typescript/src/index.ts`.
- **Dependencias declaradas:** `@codestellation/parser-core` como workspace dependency y `typescript` en la versión ya usada por el monorepo.
- **Compatibilidad de typecheck:** `@codestellation/parser-core` expone tipos desde `src` para que `typecheck` de workspaces consumidores no requiera `dist` previo; `vitest.config.ts` agrega alias de test hacia el source del parser core.
- **Parser nuevo:** `TypeScriptParser`, `typescriptParser`, `createTypeScriptParser`, `canParseTypeScriptFile` y `parseTypeScriptSourceText`.
- **Entrada soportada:** `ParserCoreParseableFile` con lenguaje `typescript` o `tsx`, rol `source`, `test` o `declaration`, más `sourceText` provisto explícitamente.
- **Salida:** `ParserCoreParseUnitResult` serializable con descriptor `typescript-parser`, estado `completed`, `partial` o `skipped`, diagnósticos `PARSER_TYPESCRIPT_*`, símbolos top-level, imports estáticos/type-only/dinámicos básicos y exports named/default/type-only/namespace básicos.
- **Diagnósticos:** errores sintácticos de TypeScript se reportan como diagnósticos recuperables con rango cuando TypeScript lo provee; el resultado queda `partial` y no lanza excepción por sintaxis inválida.
- **Modo seguro:** el método `parse` del plugin no lee archivos; si no recibe texto fuente, devuelve `skipped` con `PARSER_TYPESCRIPT_SOURCE_TEXT_REQUIRED`.
- **Pruebas:** se agregó `packages/parser-typescript/test/typescript-parser.test.ts` para parsing TS, parsing TSX, diagnósticos sintácticos y skips seguros.
- **Limitación principal:** todavía no existe adaptador desde `repository-scanner` hacia `parser-core`, no se lee contenido desde filesystem, no se resuelven módulos, no se hace type-check semántico, no se analizan referencias profundas y no se construye grafo.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(analyzer-static): extract imports and exports`
- **Objetivo:** iniciar el analizador estático que consuma resultados del parser para convertir imports/exports en registros de análisis preparados para relaciones futuras.
- **Archivos probables:**
  - `packages/analyzer-static/src/import-export-analysis.ts` o equivalente;
  - `packages/analyzer-static/src/index.ts`;
  - `packages/analyzer-static/test/import-export-analysis.test.ts`;
  - `packages/analyzer-static/package.json` si se requiere dependencia directa a `parser-core`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - consumir `ParserCoreParseUnitResult` o un lote de resultados;
  - separar imports, exports y diagnósticos de análisis;
  - mantener salida determinística y serializable;
  - no resolver módulos contra filesystem todavía;
  - no construir nodos ni edges del grafo todavía.

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

Validación focalizada para el Commit 023:

```bash
pnpm --filter @codestellation/parser-core typecheck
pnpm --filter @codestellation/parser-typescript typecheck
pnpm test -- packages/parser-core/test/parser-result.test.ts packages/parser-typescript/test/typescript-parser.test.ts
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
- El parser TypeScript usa `createSourceFile` y diagnósticos sintácticos; todavía no crea `Program`, no usa type checker y no resuelve imports contra archivos reales.
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
