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
- TypeScript 7.0.2 como dependencia de desarrollo.

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

El paquete `@codestellation/graph-model` ya define el contrato canónico inicial de nodos y relaciones del grafo. Los nodos son serializables, versionados y desacoplados de parser, almacenamiento, API y UI. El MVP 1 reconoce nodos de proyecto, paquete, carpeta, archivo y símbolo, con identificadores `node:`, rutas relativas seguras, metadata mínima de visualización y facetas de análisis. Las relaciones usan identificadores `edge:`, declaran direccionalidad explícita y cubren vínculos iniciales como contiene, importa, exporta, declara, llama, referencia y depende de.

## Documentación del producto

La documentación base del producto, su arquitectura y las reglas de continuidad están organizadas en:

- [`docs/00_CODESTELLATION_MASTER_PLAN.md`](./docs/00_CODESTELLATION_MASTER_PLAN.md): visión, alcance, propuesta de valor, casos de uso, MVP y criterios del primer release útil.
- [`docs/01_ARCHITECTURE_AND_COMPONENTS.md`](./docs/01_ARCHITECTURE_AND_COMPONENTS.md): límites del sistema, componentes, dependencias internas y flujos de indexación y contexto.
- [`docs/04_AI_DEVELOPMENT_PLAYBOOK.md`](./docs/04_AI_DEVELOPMENT_PLAYBOOK.md): unidad de trabajo, reglas para desarrollo asistido por IA, validaciones y Definition of Done.
- [`docs/02_ENGINEERING_QUALITY.md`](./docs/02_ENGINEERING_QUALITY.md): línea base de calidad, typecheck estricto, formato, límites entre workspaces, pruebas y cobertura.
- [`CODESTELLATION_PROJECT_STATE.md`](./CODESTELLATION_PROJECT_STATE.md): estado operativo breve, próximo commit exacto, riesgos y archivos clave.
- [`CODESTELLATION_DECISIONS.md`](./CODESTELLATION_DECISIONS.md): índice y contenido de las decisiones arquitectónicas vigentes.

## Estado

La **Fase 1 — Bootstrap del monorepo** está completa y la **Fase 2 — Contratos y modelo canónico** continúa. El workspace TypeScript ya está inicializado con tres aplicaciones y veinte paquetes compilables. La línea base de calidad valida formato, límites entre workspaces, typecheck estricto y ejecución de pruebas con Vitest. La integración continua ejecuta instalación, lint, typecheck, test y build en `main`, `develop` y ramas de feature. El paquete `@codestellation/contracts` ya define identificadores base, errores estructurados y diagnósticos serializables. El paquete `@codestellation/graph-model` ya define nodos canónicos para proyecto, paquete, carpeta, archivo y símbolo, además de relaciones canónicas iniciales entre nodos. El siguiente paso es agregar metadata compartida de procedencia y confianza.

> Comprender antes de cambiar. Conectar antes de generar. Actualizar sin perder contexto.
