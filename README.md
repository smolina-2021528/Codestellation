# Codestellation

Codestellation transforma repositorios de software en una **constelación navegable, jerárquica y dinámica de conocimiento técnico** para que desarrolladores y agentes de inteligencia artificial puedan comprender un sistema antes de modificarlo.

## Propósito

El producto combina tres capacidades que deben permanecer claramente separadas:

1. **Mapa visual:** permite explorar arquitectura, servicios, módulos, archivos, símbolos, flujos y dependencias por niveles.
2. **Grafo de conocimiento:** conserva una representación versionada, trazable e incremental de lo que existe y cómo se conecta.
3. **Motor de contexto:** selecciona evidencia, reglas, código y pruebas relevantes para una tarea concreta sin obligar a una IA a releer todo el repositorio.

El código fuente continúa siendo la verdad primaria. El grafo es una representación derivada y cada inferencia debe distinguirse de los hechos confirmados y del conocimiento validado por personas.

## Problema

Codestellation busca reducir:

- el tiempo necesario para comprender proyectos grandes o desconocidos;
- la dependencia de conocimiento concentrado en pocas personas;
- la exploración repetitiva de archivos en cada sesión con una IA;
- los cambios aislados que ignoran consumidores, contratos y pruebas;
- el consumo innecesario de tokens al reconstruir contexto;
- la documentación manual que queda desactualizada.

## Usuarios principales

- desarrolladores que se incorporan a un proyecto;
- vibecoders y equipos pequeños que trabajan con IA;
- desarrolladores senior, arquitectos y líderes técnicos;
- agentes de IA que necesitan contexto mínimo suficiente y verificable;
- auditores y consultores que deben recorrer relaciones y evidencia.

## Principios del producto

- **Local-first:** el análisis, almacenamiento, búsqueda y visualización deben poder ejecutarse sin enviar código a servicios externos.
- **Determinismo primero:** AST, configuración y análisis estático tienen prioridad sobre inferencias semánticas.
- **Incremental por diseño:** los cambios deben actualizar únicamente los subgrafos afectados cuando sea posible.
- **Independencia de proveedor:** el núcleo no depende de un modelo de IA específico.
- **Revelado progresivo:** la interfaz muestra el nivel de detalle adecuado a la tarea, no todos los nodos a la vez.
- **Procedencia verificable:** cada dato derivado debe poder rastrearse hasta su evidencia.

## MVP

El primer ecosistema soportado será **TypeScript/JavaScript**, incluyendo Node.js, React, Next.js y estructuras HTTP como Express.

El MVP deberá poder:

- importar una carpeta local, un ZIP o un repositorio Git público;
- detectar estructura, archivos, paquetes, símbolos, imports y exports;
- construir y persistir un grafo navegable;
- mostrar búsqueda, filtros, expansión, dependencias y código asociado;
- generar paquetes de contexto Markdown y JSON para una tarea;
- registrar snapshots y realizar una actualización incremental básica.

## Fuera de alcance inicial

El primer MVP no intentará soportar todos los lenguajes, inferir automáticamente todos los flujos de negocio, ejecutar código no confiable sin aislamiento, reemplazar un IDE completo ni convertirse en una plataforma general de gestión de proyectos.

## Estructura inicial del monorepo

```text
codestellation/
├── apps/
│   ├── api/
│   ├── cli/
│   └── web/
├── packages/
│   ├── contracts/
│   ├── graph-model/
│   ├── source-ingestion/
│   ├── repository-scanner/
│   ├── parser-core/
│   ├── parser-typescript/
│   ├── analyzer-static/
│   ├── analyzer-frameworks/
│   ├── analyzer-semantic/
│   ├── graph-builder/
│   ├── graph-store/
│   ├── search-index/
│   ├── context-engine/
│   ├── impact-engine/
│   ├── snapshot-engine/
│   ├── exporter/
│   ├── agent-adapter/
│   ├── config/
│   ├── observability/
│   └── testing-fixtures/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Todos los workspaces contienen únicamente scaffolding compilable. La lógica funcional se incorporará en commits posteriores respetando la dirección de dependencias documentada.

## Desarrollo local

### Requisitos

- Node.js 22 o superior;
- pnpm 11.14.0, fijado mediante `packageManager`;
- TypeScript 7.0.2 como dependencia de desarrollo;
- `@types/node` 22.20.1 para tipar APIs nativas de Node usadas por el resolver local.

### Comandos

```bash
pnpm --version
pnpm install
pnpm lint
pnpm format:check
pnpm boundaries:check
pnpm build
pnpm typecheck
pnpm test
pnpm coverage
pnpm run ci:check
```

En Windows, si `corepack enable` falla con `EPERM` intentando escribir en `C:\Program Files\nodejs`, no es necesario repetirlo si `pnpm` ya responde en la terminal. Si `pnpm` no existe, instalar pnpm con permisos adecuados o usar una terminal elevada antes de volver a ejecutar los comandos del proyecto.

El comando `lint` ejecuta validaciones internas de formato y límites entre workspaces. El comando `test` ejecuta Vitest sobre las suites ubicadas en `test/` dentro de aplicaciones, paquetes y scripts. El comando `coverage` genera reportes con el proveedor V8 y `ci:check` agrupa localmente la misma secuencia que ejecuta la integración continua.

## Contratos base

El paquete `@codestellation/contracts` define los identificadores canónicos iniciales del MVP 1 para proyectos, fuentes, archivos fuente, revisiones y snapshots. Estos identificadores son strings serializables con marcas nominales de TypeScript, prefijos explícitos, validadores runtime y helpers de creación/parsing sin dependencia de almacenamiento concreto.

El mismo paquete también define errores estructurados y diagnósticos serializables. Cada diagnóstico tiene versión de esquema, código estable, severidad, mensaje, bandera `retryable` y contexto seguro sanitizado antes de exponerse en logs, CLI, API o UI.

## Modelo de grafo base

El paquete `@codestellation/graph-model` ya define el contrato canónico inicial de nodos, relaciones y snapshots del grafo. Los nodos son serializables, versionados y desacoplados de parser, almacenamiento, API y UI. El MVP 1 reconoce nodos de proyecto, paquete, carpeta, archivo y símbolo, con identificadores `node:`, rutas relativas seguras, metadata mínima de visualización y facetas de análisis. Las relaciones usan identificadores `edge:`, declaran direccionalidad explícita y cubren vínculos iniciales como contiene, importa, exporta, declara, llama, referencia y depende de. Tanto nodos como relaciones incluyen metadata obligatoria de confianza y procedencia para diferenciar hechos confirmados, inferencias probables, posibilidades y validaciones humanas con evidencia rastreable. La validación de snapshots completos verifica versión de esquema, raíz de proyecto, unicidad global de IDs, padres existentes y endpoints de relaciones antes de persistir o exportar un grafo.

## Ingesta de fuentes

El paquete `@codestellation/source-ingestion` ya define los contratos de entrada versionados para las tres fuentes del MVP 1: carpeta local, archivo ZIP y repositorio Git público. Estos contratos validan rutas locales, patrones de inclusión/exclusión, URLs HTTPS de Git, referencias, límites de escaneo y opciones de seguridad sin extraer ZIPs, clonar repositorios ni ejecutar código externo. La configuración serializable mantiene `followSymlinks: false`, `executeRepositoryCode: false` e historial Git en modo `metadata-only` por defecto.

La ingesta segura ya puede resolver una fuente `local-folder` contra el filesystem en modo solo lectura. El resolver confirma que la ruta existe, que es un directorio, que no es un symlink raíz y devuelve metadata serializable con path solicitado, path absoluto, `realPath`, nombre del directorio, opciones efectivas y estado del filesystem.

El mismo paquete ya puede crear un inventario normalizado de archivos para una carpeta local resuelta. El inventario recorre directorios en modo solo lectura, no sigue symlinks, aplica patrones `include` y `exclude`, respeta `maxFiles` y `maxFileSizeBytes`, excluye directorios técnicos por defecto como `.git`, `node_modules`, `dist`, `.next`, `.turbo`, `coverage` y `out`, y devuelve rutas relativas normalizadas con tamaño, timestamps y una clasificación inicial del tipo de archivo. Todavía no lee el contenido completo de los archivos, no extrae ZIPs, no clona Git, no construye nodos del grafo y no ejecuta código del repositorio analizado.

## Scanner de repositorios

El paquete `@codestellation/repository-scanner` ya define contratos versionados para consumir un inventario normalizado compatible con `source-ingestion` y producir resultados de escaneo serializables. El contrato distingue estados `completed`, `partial` y `failed`; separa referencias de archivos candidatos e ignorados; modela motivos visibles de exclusión; conserva advertencias y errores con códigos `REPOSITORY_SCAN_*`; registra tiempos de ejecución; y valida que los conteos del resultado sean consistentes con el inventario de origen. El contrato se mantiene estructural para que `typecheck` no dependa de artefactos `dist` generados por otro workspace.

El scanner ya puede clasificar de forma pura y determinística las entradas del inventario usando únicamente metadata disponible: path relativo normalizado, extensión, tamaño, timestamps y `kind` inicial. La clasificación marca como candidatos archivos `source`, `test`, `manifest` y `config`; ignora documentación, assets, binarios, minificados, generados, vendored y archivos potencialmente sensibles con motivos visibles; y conserva archivos `unknown` como no clasificados con warning. También preserva warnings y errores del inventario de origen dentro del resultado del scan sin leer contenido de archivos.

El scanner ya detecta manifests de paquetes desde el resultado clasificado, también sin leer contenido. La detección inicial reconoce `package.json` como manifest de paquete Node mediante path, nombre de archivo y metadata del inventario; distingue manifests en la raíz y manifests anidados con `packageRootPath`; reporta otros manifest candidates como unsupported mediante warnings; y falla de forma segura si el scan clasificado de origen está en estado `failed`.

El scanner ya deriva un resumen estructural inicial del repositorio desde el scan clasificado y los manifests detectados. El resumen reporta archivos raíz, directorios top-level, profundidad máxima, paquetes raíz/anidados, conteos por tipo de archivo, candidatos, ignorados, tamaño total y roles de directorio de forma determinística. Este paso sigue siendo metadata-only: no lee contenido completo, no interpreta `package.json`, no resuelve workspaces ni dependencias y no construye nodos del grafo.

El scanner todavía no calcula hashes, no lee `package.json`, no extrae nombre, versión, scripts, dependencias o workspaces, no infiere lenguajes o stacks, no invoca parsers y no construye nodos ni relaciones del grafo.

## Parser core y parser TypeScript

El paquete `@codestellation/parser-core` ya define los contratos base para parsers específicos. Estos contratos modelan referencias parseables de archivos, lenguajes iniciales del MVP (`typescript`, `tsx`, `javascript`, `jsx`, `json` y `unknown`), roles de archivo, rangos de texto con offset/línea/columna, descriptor de parser, diagnósticos `PARSER_*`, registros normalizados de símbolos, imports, exports y referencias, además de resultados serializables por archivo y por lote.

El paquete `@codestellation/parser-typescript` ya implementa el primer parser específico del MVP. El parser recibe un `ParserCoreParseableFile` y texto fuente provisto explícitamente por el pipeline local, devuelve `ParserCoreParseUnitResult`, reporta errores sintácticos básicos como diagnósticos recuperables, extrae símbolos top-level básicos e imports/exports sintácticos básicos, y conserva operación filesystem-free desde el plugin.

El paquete `@codestellation/analyzer-static` ya consume resultados normalizados de `parser-core` para extraer imports y exports como registros de análisis preparados para relaciones futuras. El análisis separa resultados por archivo y agregados, clasifica module specifiers como relativos, absolutos, paquetes, built-ins o desconocidos, marca imports type-only/dinámicos, marca re-exports y type-only exports, conserva diagnósticos propios `ANALYZER_STATIC_*` y no resuelve módulos contra filesystem.

El parser y el analizador estático todavía no leen archivos desde disco, no calculan hashes, no crean un `Program`, no usan type checker, no resuelven módulos, no analizan referencias profundas ni integran todavía un pipeline scanner-parser end-to-end.

## Graph builder

El paquete `@codestellation/graph-builder` ya inicia el ensamblaje del grafo canónico creando nodos de proyecto, carpetas y archivos desde `RepositoryStructureSummaryResult`. El resultado `GraphBuilderProjectFileGraphResult` incluye un snapshot válido de `graph-model`, un único nodo `project`, nodos `folder` para todos los directorios derivados de paths del inventario y nodos `file` para cada archivo inventariado. Cada nodo conserva identidad estable, parentId jerárquico, metadata de visualización, facetas de análisis, confianza `confirmed` y procedencia `source-scan`.

Este paso sigue siendo metadata-only: no lee contenido de archivos, no interpreta manifests, no crea nodos de paquete ni símbolos, no crea edges, no resuelve imports/exports y no ejecuta código del repositorio analizado. El siguiente límite recomendado es crear nodos de paquete y relaciones iniciales desde manifests detectados.

## Documentación del producto

La documentación base del producto, su arquitectura y las reglas de continuidad están organizadas en:

- [`docs/00_CODESTELLATION_MASTER_PLAN.md`](./docs/00_CODESTELLATION_MASTER_PLAN.md): visión, alcance, propuesta de valor, casos de uso, MVP y criterios del primer release útil.
- [`docs/01_ARCHITECTURE_AND_COMPONENTS.md`](./docs/01_ARCHITECTURE_AND_COMPONENTS.md): límites del sistema, componentes, dependencias internas y flujos de indexación y contexto.
- [`docs/04_AI_DEVELOPMENT_PLAYBOOK.md`](./docs/04_AI_DEVELOPMENT_PLAYBOOK.md): unidad de trabajo, reglas para desarrollo asistido por IA, validaciones y Definition of Done.
- [`docs/02_ENGINEERING_QUALITY.md`](./docs/02_ENGINEERING_QUALITY.md): línea base de calidad, typecheck estricto, formato, límites entre workspaces, pruebas y cobertura.
- [`CODESTELLATION_PROJECT_STATE.md`](./CODESTELLATION_PROJECT_STATE.md): estado operativo breve, próximo commit exacto, riesgos y archivos clave.
- [`CODESTELLATION_DECISIONS.md`](./CODESTELLATION_DECISIONS.md): índice y contenido de las decisiones arquitectónicas vigentes.

## Estado

La **Fase 1 — Bootstrap del monorepo** y la **Fase 2 — Contratos y modelo canónico** están completas para la línea base del MVP 1. La **Fase 3 — Ingesta segura inicial** ya cuenta con contratos de entrada, resolución real de carpetas locales e inventario normalizado de archivos en modo solo lectura. La **Fase 4 — Scanner de repositorios** ya tiene contratos, clasificación inicial de archivos, detección metadata-only de `package.json` y resumen estructural inicial. La **Fase 5 — Parsers y análisis estático inicial** ya cuenta con contratos base de parser core, primer parser TypeScript/TSX sobre texto fuente provisto por el pipeline y extracción estática inicial de imports/exports sin resolución de módulos. La **Fase 6 — Graph builder inicial** ya comenzó con creación de nodos de proyecto, carpetas y archivos desde el resumen estructural del scanner; todavía no existen nodos de paquete, símbolos, edges, integración scanner-parser, resolución de módulos ni análisis de referencias profundas. El workspace TypeScript mantiene tres aplicaciones y veinte paquetes compilables, con validaciones de formato, límites entre workspaces, typecheck estricto, pruebas y CI.

> Comprender antes de cambiar. Conectar antes de generar. Actualizar sin perder contexto.
