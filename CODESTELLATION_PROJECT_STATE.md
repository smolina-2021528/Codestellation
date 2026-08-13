# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-08-12
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `feat(graph-builder): resolve imported symbol references`
- **Número operativo:** Commit 034
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 7 con flujo CLI end-to-end, parseo opt-in, imports relativos, símbolos y referencias importadas iniciales
- **Estado general:** stable scaffolding; normalized source inventory active; repository scan contracts active; deterministic metadata-only file classification active; Node package manifest detection active; repository structure summary active; parser core contracts active; TypeScript/TSX source-text parser active; static import/export analyzer active; graph builder project/folder/file/package node generation active; metadata-only contains edges active; graph builder import/export edges from static analysis active; graph builder symbol nodes and declares edges active; graph builder relative import edge resolution active; graph builder parser reference edge projection active; graph builder imported symbol reference resolution active; TypeScript parser identifier reference extraction active; CLI local folder graph JSON export active; safe CLI source text parsing pipeline active; CLI opt-in reference graph enrichment active

## 2. Objetivo actual

Resolver una primera capa de referencias importadas usando solo información ya producida por el pipeline: referencias sintácticas no resueltas, imports relativos resueltos y nodos de símbolos exportados. El objetivo es conectar usos de símbolos importados hacia símbolos exportados por el archivo destino cuando exista un único match determinístico. No usa type checker, no analiza scopes complejos, no soporta aliases/paths, no lee contenido adicional y no ejecuta código del repositorio analizado.

## 3. Último commit completado

- **Commit:** `feat(graph-builder): resolve imported symbol references`
- **Paquete principal:** `packages/graph-builder`.
- **Archivo principal nuevo:** `packages/graph-builder/src/imported-symbol-references.ts`.
- **Contrato nuevo:** `GraphBuilderImportedSymbolGraphResult`.
- **Entrada:** `GraphBuilderReferenceGraphResult` con imports relativos ya resueltos, símbolos declarados/exportados y referencias sintácticas no resueltas.
- **Resolución nueva:** una referencia no local puede convertirse en edge `references` archivo→símbolo cuando el archivo origen importa de forma relativa a un archivo local y ese archivo destino expone un único símbolo exportado con el mismo nombre.
- **Preservación segura:** referencias sin match, con match ambiguo, sin archivo canónico o con razones distintas a `no-local-symbol-match` permanecen como `unresolvedSymbolReferences`.
- **CLI actualizado:** la etapa opt-in `--parse-source-text` ahora puede devolver grafo enriquecido hasta `GraphBuilderImportedSymbolGraphResult`.
- **Modo seguro:** no usa type checker, no interpreta `tsconfig.paths`, no soporta aliases ni package exports, no lee contenido adicional y no ejecuta código del repositorio analizado.
- **Pruebas:** `packages/graph-builder/test/imported-symbol-references.test.ts` cubre resolución importada determinística, preservación de referencias ambiguas/no resueltas y serialización.

## 4. Próximo commit recomendado

- **Commit sugerido:** `feat(graph-builder): create call edges from parser references`
- **Objetivo:** proyectar llamadas sintácticas seguras como edges `calls` cuando una referencia `call` ya esté resuelta contra un símbolo de función/método/componente/hook.
- **Archivos probables:**
  - `packages/graph-builder/src/*`;
  - `packages/graph-builder/test/*`;
  - `apps/cli/src/index.ts` si se expone el nuevo resultado;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - usar únicamente reference edges y symbol nodes ya existentes;
  - no usar type checker;
  - no inferir dispatch dinámico;
  - no cruzar a dependencias externas;
  - preservar operación local-first sin ejecutar código del repositorio analizado.

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

Validación focalizada para el Commit 034:

```bash
pnpm --filter @codestellation/graph-builder typecheck
pnpm --filter @codestellation/cli typecheck
pnpm test -- packages/graph-builder/test/imported-symbol-references.test.ts apps/cli/test/index-local.test.ts packages/graph-builder/test/reference-edges.test.ts
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
- Los contratos de parser core todavía no tienen adaptador directo desde `repository-scanner`; se mantienen estructurales dentro del pipeline CLI.
- El parser TypeScript solo parsea texto fuente provisto explícitamente; el CLI puede leerlo de forma opt-in para TypeScript/TSX candidato bajo límite de tamaño. Ya extrae referencias sintácticas básicas de identificadores/calls con filtros conservadores, pero no infiere scopes profundos.
- El parser TypeScript no crea `Program`, no usa type checker y no resuelve imports contra archivos reales.
- El analizador estático clasifica module specifiers pero todavía no los resuelve contra filesystem, package manifests, tsconfig paths o aliases.
- El graph-builder crea nodos externos de package desde imports de paquetes/built-ins, pero esos nodos son inferencias `possible`, no dependencias declaradas ni verificadas.
- Los imports relativos simples ya pueden generar edges `imports` archivo→archivo cuando existe match determinístico; imports absolutos, desconocidos o relativos sin target se conservan como no resueltos.
- El graph-builder ya crea nodos de símbolos, edges `declares`, edges `imports` relativos simples archivo→archivo, edges `references` sintácticos archivo→símbolo desde referencias parser-core de mismo archivo y referencias importadas determinísticas desde imports relativos hacia símbolos exportados; todavía no crea edges `calls`, `depends-on` reales ni relaciones derivadas de contenido de manifests.
- El export CLI incluye metadata local serializable de la fuente; esto es esperado para uso local explícito, pero API/UI deberán aplicar política antes de exponer rutas sensibles.

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
- `apps/cli/src/index.ts`
- `apps/cli/test/index-local.test.ts`
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
- `packages/graph-builder/src/package-dependency-edges.ts`
- `packages/graph-builder/src/import-export-edges.ts`
- `packages/graph-builder/src/symbol-nodes.ts`
- `packages/graph-builder/src/relative-import-edges.ts`
- `packages/graph-builder/src/reference-edges.ts`
- `packages/graph-builder/src/imported-symbol-references.ts`
- `packages/graph-builder/test/project-file-nodes.test.ts`
- `packages/graph-builder/test/package-dependency-edges.test.ts`
- `packages/graph-builder/test/import-export-edges.test.ts`
- `packages/graph-builder/test/symbol-nodes.test.ts`
- `packages/graph-builder/test/relative-import-edges.test.ts`
- `packages/graph-builder/test/reference-edges.test.ts`
- `packages/graph-builder/test/imported-symbol-references.test.ts`
