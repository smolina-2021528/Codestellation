# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `test(tooling): add test runner and shared test utilities`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 1 en progreso; testing baseline completado
- **Estado general:** stable scaffolding; quality and testing baseline active

## 2. Objetivo actual

Mantener una base mínima, instalable, compilable y verificable de monorepo TypeScript con límites físicos para aplicaciones y paquetes. El objetivo inmediato ahora es conectar esa base a integración continua sin modificar todavía lógica funcional del producto.

## 3. Último commit completado

- **Commit:** `test(tooling): add test runner and shared test utilities`
- **Resultado:** se agregó un runner real de pruebas para el monorepo, cobertura base y utilidades compartidas para construir fixtures determinísticos.
- **Runner:** Vitest, configurado en la raíz con suites `test/**/*.test.ts` y `test/**/*.spec.ts` dentro de `apps/`, `packages/` y `scripts/`.
- **Cobertura:** proveedor V8 mediante `@vitest/coverage-v8`, con salida en `coverage/`.
- **Utilidades agregadas:** creación de archivos fixture, normalización segura de rutas, árboles de fixture y fixtures de repositorio.
- **Scripts agregados o ajustados:** `test`, `test:watch`, `coverage`, `ci:check` y `quality` incluyendo pruebas.
- **Validaciones:** el smoke test de `packages/testing-fixtures` valida infraestructura y utilidades iniciales.
- **Limitaciones:** todavía no existe workflow de CI en GitHub Actions ni validación en servidor remoto.

## 4. Próximo commit exacto

- **Commit sugerido:** `ci(repo): add continuous integration baseline`
- **Objetivo:** agregar una línea base de CI que instale dependencias y ejecute lint, typecheck, test y build sobre `main`, `develop` y ramas de feature relevantes.
- **Archivos o paquetes probables:**
  - `.github/workflows/ci.yml`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`;
  - eventualmente ajustes menores a scripts de raíz si el entorno CI lo requiere.
- **Criterios de aceptación:**
  - [ ] CI instala usando pnpm;
  - [ ] CI ejecuta `pnpm lint`;
  - [ ] CI ejecuta `pnpm typecheck`;
  - [ ] CI ejecuta `pnpm test`;
  - [ ] CI ejecuta `pnpm build`;
  - [ ] no se implementa lógica funcional del producto;
  - [ ] este archivo queda actualizado al finalizar.
- **Fuera de alcance:** publicación de paquetes, releases, despliegue, tests e2e, API, CLI funcional y persistencia.

## 5. Arquitectura implementada

```text
Monorepo TypeScript
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
├── docs/
├── scripts/
├── vitest.config.ts
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Las aplicaciones y la mayoría de paquetes todavía no contienen lógica funcional ni dependencias internas. `packages/testing-fixtures` contiene únicamente utilidades de prueba compartidas.

## 6. Contratos vigentes

| Contrato | Ubicación | Estado | Consumidores principales |
|---|---|---|---|
| Límites y dirección de dependencias | `docs/01_ARCHITECTURE_AND_COMPONENTS.md` | documented | todos los workspaces |
| Línea base de calidad | `docs/02_ENGINEERING_QUALITY.md` | active | todos los workspaces |
| Línea base de pruebas | `vitest.config.ts` y `packages/testing-fixtures` | active | paquetes, apps y scripts |
| Workspace y versiones de runtime | `package.json` y `pnpm-workspace.yaml` | active | desarrollo local y futura CI |
| Configuración TypeScript compartida | `tsconfig.base.json` | active | 23 workspaces |
| Flujo de trabajo por commit | `docs/04_AI_DEVELOPMENT_PLAYBOOK.md` | active | mantenedores y agentes de IA |
| Estado operativo | `CODESTELLATION_PROJECT_STATE.md` | active | siguiente sesión de desarrollo |
| Decisiones arquitectónicas | `CODESTELLATION_DECISIONS.md` | active | todos los componentes futuros |

## 7. Componentes completados

- [x] visión, problema, usuarios, alcance y MVP;
- [x] límites del sistema y flujos principales;
- [x] estrategia de continuidad y registro de decisiones;
- [x] monorepo pnpm;
- [x] aplicaciones `api`, `cli` y `web` en scaffolding;
- [x] veinte paquetes internos en scaffolding;
- [x] configuración TypeScript compartida;
- [x] scripts raíz de build, test y typecheck;
- [x] ignore rules iniciales;
- [x] línea base de formato;
- [x] validación de límites entre workspaces;
- [x] TypeScript estricto con reglas adicionales;
- [x] runner de pruebas con Vitest;
- [x] cobertura base con proveedor V8;
- [x] utilidades compartidas para fixtures determinísticos;
- [x] smoke tests iniciales.

## 8. Componentes en progreso

- [ ] línea base de integración continua.

## 9. Pendientes priorizados

1. Agregar CI para instalar, validar calidad, ejecutar pruebas y compilar.
2. Iniciar los contratos centrales del modelo de grafo.
3. Avanzar hacia el primer flujo funcional de indexación local.
4. Generar fixtures de grafo cuando existan contratos canónicos.

## 10. Decisiones vigentes

- ADR-001: usar un monorepo TypeScript con pnpm workspaces y sin orquestador adicional inicialmente.
- ADR-002: mantener el modelo canónico de grafo independiente de la persistencia concreta.
- ADR-003: operar local-first y requerir consentimiento explícito para transmitir código a servicios remotos.
- Decisión operativa del Commit 004: Node.js 22+ y pnpm 11.14.0 para el bootstrap.
- Decisión operativa del Commit 005 correctivo: usar una versión publicable de TypeScript y no depender de `corepack enable` cuando pnpm ya esté disponible localmente.
- Decisión operativa del commit de calidad: usar validadores internos para formato y límites hasta que exista suficiente código para justificar ESLint/Prettier o reglas más complejas.
- Decisión operativa del commit de testing: usar Vitest como runner raíz y centralizar fixtures compartidos en `@codestellation/testing-fixtures`.

## 11. Deuda y limitaciones conocidas

| ID | Descripción | Riesgo | Fase objetivo |
|---|---|---|---|
| LIMIT-006 | No existe CI ni validación automatizada en servidor. | medium | próximo commit |
| LIMIT-007 | Persistencia, identidad estable y framework visual continúan pendientes de ADR específicos. | medium | Fases 2–7 |
| LIMIT-008 | ESLint/Prettier no están instalados todavía; la calidad inicial depende de TypeScript estricto y validadores internos. | low | cuando el código real lo requiera |
| LIMIT-009 | Cobertura existe como infraestructura, pero aún no tiene umbrales porque casi no hay lógica funcional. | low | cuando existan contratos y módulos reales |

## 12. Riesgos o bloqueos

- Ningún bloqueo de diseño activo.
- La primera instalación local debe generar o actualizar `pnpm-lock.yaml` para cerrar reproducibilidad completa.
- El siguiente commit debe evitar implementar lógica de producto; solo debe conectar la validación existente a CI.

## 13. Comandos disponibles y validación

```bash
pnpm --version
pnpm install
pnpm lint
pnpm format:check
pnpm boundaries:check
pnpm build
pnpm typecheck
pnpm test
pnpm test:watch
pnpm coverage
pnpm quality
pnpm run ci:check
```

- `build`: coordina los scripts de compilación de los workspaces.
- `lint`: valida formato y límites entre workspaces.
- `format:check`: valida finales de línea, newline final y espacios sobrantes.
- `boundaries:check`: valida nombres, capas y dependencias internas.
- `typecheck`: valida los workspaces sin emitir archivos.
- `test`: ejecuta Vitest en modo run.
- `test:watch`: ejecuta Vitest en modo interactivo.
- `coverage`: ejecuta Vitest con cobertura V8.
- `quality`: ejecuta `lint`, `typecheck` y `test`.
- `ci:check`: ejecuta `lint`, `typecheck`, `test` y `build` para preparar la futura CI.
- Validación pendiente en entorno local con acceso al registro: `pnpm install`, `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm coverage`, `pnpm quality` y `pnpm run ci:check`.

## 14. Fixtures y datos de prueba

- `packages/testing-fixtures/src/index.ts`: utilidades mínimas compartidas para rutas, archivos, árboles y repositorios fixture.
- `packages/testing-fixtures/test/testing-fixtures.test.ts`: smoke test de infraestructura y comportamiento determinístico.
- Todavía no existen fixtures de grafo, parser, repositorios hostiles ni pruebas e2e.

## 15. Archivos clave para retomar

1. `CODESTELLATION_PROJECT_STATE.md`
2. `package.json`
3. `vitest.config.ts`
4. `packages/testing-fixtures/src/index.ts`
5. `packages/testing-fixtures/test/testing-fixtures.test.ts`
6. `tsconfig.base.json`
7. `scripts/check-format.mjs`
8. `scripts/check-workspace-boundaries.mjs`
9. `docs/02_ENGINEERING_QUALITY.md`
10. `pnpm-workspace.yaml`
11. `CODESTELLATION_DECISIONS.md`
12. `docs/01_ARCHITECTURE_AND_COMPONENTS.md`
13. `docs/04_AI_DEVELOPMENT_PLAYBOOK.md`

## 16. Configuración local necesaria

- **Runtime:** Node.js 22 o superior.
- **Package manager:** pnpm 11.14.0. Corepack es opcional si pnpm ya está disponible en la terminal.
- **Variables:** ninguna.
- **Servicios:** ninguno.
- **Puertos:** ninguno.

## 17. Notas para la siguiente IA

- Verificar los archivos reales antes de asumir que el estado sigue vigente.
- Trabajar únicamente el próximo commit exacto indicado en este documento.
- No implementar lógica funcional durante los commits de tooling.
- No agregar publicación, release ni despliegue dentro del commit de CI.
- Actualizar este archivo al terminar cada commit.
- Registrar un ADR solamente para decisiones significativas.
- Entregar únicamente archivos nuevos o editados; no generar proyectos completos ni patches salvo solicitud explícita.
