# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `chore(quality): configure lint formatting and type checks`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 1 en progreso; línea base de calidad completada
- **Estado general:** stable scaffolding; quality baseline active

## 2. Objetivo actual

Mantener una base mínima, instalable, compilable y verificable de monorepo TypeScript con límites físicos para aplicaciones y paquetes. El siguiente objetivo es incorporar runner de pruebas, utilidades compartidas y el primer contrato de ejecución de tests sin implementar todavía lógica funcional.

## 3. Último commit completado

- **Commit:** `chore(quality): configure lint formatting and type checks`
- **Resultado:** se agregó una línea base de calidad para formato, límites arquitectónicos y TypeScript estricto.
- **Scripts agregados:** `lint`, `format:check`, `boundaries:check` y `quality`.
- **Documentación agregada:** `docs/02_ENGINEERING_QUALITY.md`.
- **Decisión técnica:** se usan validadores internos pequeños para formato y límites en lugar de agregar ESLint/Prettier todavía; esto reduce fricción de instalación mientras el repositorio solo tiene scaffolding.
- **Validaciones:** `node scripts/check-format.mjs` y `node scripts/check-workspace-boundaries.mjs` pasan sobre la estructura actual.
- **Limitaciones:** no se agregaron runner de pruebas, cobertura ni CI.

## 4. Próximo commit exacto

- **Commit sugerido:** `test(tooling): add test runner and shared test utilities`
- **Objetivo:** incorporar un runner de pruebas para todos los workspaces, definir comandos de test consistentes y crear utilidades mínimas compartidas para fixtures futuros.
- **Archivos o paquetes probables:**
  - `package.json`;
  - manifests de workspaces cuando sea necesario;
  - configuración del runner de pruebas;
  - `packages/testing-fixtures`;
  - primeros archivos `*.test.ts` o `*.spec.ts` de smoke test;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios de aceptación:**
  - [ ] `pnpm test` ejecuta un runner real;
  - [ ] al menos un smoke test valida la infraestructura;
  - [ ] la configuración funciona con TypeScript ESM;
  - [ ] no se agrega CI todavía;
  - [ ] no se implementa lógica funcional del producto;
  - [ ] este archivo queda actualizado al finalizar.
- **Fuera de alcance:** cobertura avanzada, fixtures de grafo, pruebas e2e, CI, API, CLI funcional y persistencia.

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
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Las aplicaciones y paquetes todavía no contienen lógica funcional ni dependencias internas.

## 6. Contratos vigentes

| Contrato | Ubicación | Estado | Consumidores principales |
|---|---|---|---|
| Límites y dirección de dependencias | `docs/01_ARCHITECTURE_AND_COMPONENTS.md` | documented | todos los workspaces |
| Línea base de calidad | `docs/02_ENGINEERING_QUALITY.md` | active | todos los workspaces |
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
- [x] TypeScript estricto con reglas adicionales.

## 8. Componentes en progreso

- [ ] runner de pruebas y utilidades compartidas.

## 9. Pendientes priorizados

1. Incorporar runner de pruebas, utilidades compartidas y smoke tests.
2. Agregar la línea base de integración continua.
3. Iniciar los contratos centrales del modelo de grafo.
4. Avanzar hacia el primer flujo funcional de indexación local.

## 10. Decisiones vigentes

- ADR-001: usar un monorepo TypeScript con pnpm workspaces y sin orquestador adicional inicialmente.
- ADR-002: mantener el modelo canónico de grafo independiente de la persistencia concreta.
- ADR-003: operar local-first y requerir consentimiento explícito para transmitir código a servicios remotos.
- Decisión operativa del Commit 004: Node.js 22+ y pnpm 11.14.0 para el bootstrap.
- Decisión operativa del Commit 005 correctivo: usar una versión publicable de TypeScript y no depender de `corepack enable` cuando pnpm ya esté disponible localmente.
- Decisión operativa del commit de calidad: usar validadores internos para formato y límites hasta que exista suficiente código para justificar ESLint/Prettier o reglas más complejas.

## 11. Deuda y limitaciones conocidas

| ID | Descripción | Riesgo | Fase objetivo |
|---|---|---|---|
| LIMIT-005 | El script raíz de tests no ejecuta suites hasta incorporar el runner. | low | próximo commit |
| LIMIT-006 | No existe CI ni validación automatizada en servidor. | medium | commit posterior de CI |
| LIMIT-007 | Persistencia, identidad estable y framework visual continúan pendientes de ADR específicos. | medium | Fases 2–7 |
| LIMIT-008 | ESLint/Prettier no están instalados todavía; la calidad inicial depende de TypeScript estricto y validadores internos. | low | cuando el código real lo requiera |

## 12. Riesgos o bloqueos

- Ningún bloqueo de diseño activo.
- La primera instalación local debe generar y versionar `pnpm-lock.yaml` para cerrar reproducibilidad completa.
- El siguiente commit debe evitar incorporar lógica de producto; solo debe dejar tests ejecutables.

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
pnpm quality
```

- `build`: coordina los scripts de compilación de los workspaces.
- `lint`: valida formato y límites entre workspaces.
- `format:check`: valida finales de línea, newline final y espacios sobrantes.
- `boundaries:check`: valida nombres, capas y dependencias internas.
- `typecheck`: valida los workspaces sin emitir archivos.
- `test`: existe como contrato raíz y no ejecutará suites hasta el siguiente commit.
- `quality`: ejecuta `lint` y `typecheck`.
- Validación ejecutada en el entorno de generación: `node scripts/check-format.mjs` y `node scripts/check-workspace-boundaries.mjs`.
- Validación pendiente en entorno local con acceso al registro: `pnpm install`, `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm test` y `pnpm quality`.

## 14. Fixtures y datos de prueba

- Ninguno; `packages/testing-fixtures` contiene únicamente scaffolding.

## 15. Archivos clave para retomar

1. `CODESTELLATION_PROJECT_STATE.md`
2. `package.json`
3. `tsconfig.base.json`
4. `scripts/check-format.mjs`
5. `scripts/check-workspace-boundaries.mjs`
6. `docs/02_ENGINEERING_QUALITY.md`
7. `pnpm-workspace.yaml`
8. `CODESTELLATION_DECISIONS.md`
9. `docs/01_ARCHITECTURE_AND_COMPONENTS.md`
10. `docs/04_AI_DEVELOPMENT_PLAYBOOK.md`

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
- No agregar CI dentro del siguiente commit de testing.
- Actualizar este archivo al terminar cada commit.
- Registrar un ADR solamente para decisiones significativas.
- Entregar únicamente archivos nuevos o editados; no generar proyectos completos ni patches salvo solicitud explícita.
