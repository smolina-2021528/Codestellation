# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `fix(repo): pin installable TypeScript version and Windows setup`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 1 en progreso; Commit 005 correctivo completado
- **Estado general:** stable scaffolding; install fix applied

## 2. Objetivo actual

Mantener una base mínima, instalable y compilable de monorepo TypeScript con límites físicos para aplicaciones y paquetes. El siguiente objetivo es incorporar reglas de calidad, formatting y una validación de tipos consistente sin agregar todavía runner de pruebas ni integración continua.

## 3. Último commit completado

- **Commit:** `fix(repo): pin installable TypeScript version and Windows setup`
- **Resultado:** se corrigió el bootstrap local para permitir `pnpm install`, reemplazando `typescript@6.0.0` por `typescript@7.0.2` y documentando el caso de Windows donde `corepack enable` puede fallar por permisos sobre `C:\Program Files\nodejs`.
- **Runtime fijado:** Node.js 22 o superior.
- **Package manager fijado:** pnpm 11.14.0 mediante `packageManager`.
- **Validaciones:** `package.json` válido; README y estado del proyecto actualizados; se mantiene la estructura del monorepo sin agregar lógica funcional.
- **Limitaciones:** el entorno de generación no ejecutó instalación contra el registro de npm; no se agregaron lint, formatter, runner de pruebas, cobertura ni CI.

## 4. Próximo commit exacto

- **Commit sugerido:** `chore(quality): configure lint formatting and type checks`
- **Objetivo:** establecer una línea base uniforme de ESLint, Prettier y typecheck para todos los workspaces, incluyendo reglas de imports compatibles con los límites arquitectónicos.
- **Archivos o paquetes probables:**
  - `package.json`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `eslint.config.*`
  - configuración de Prettier;
  - ignore files de herramientas;
  - manifests de workspaces cuando sea necesario.
- **Criterios de aceptación:**
  - [ ] `pnpm lint` valida todos los workspaces;
  - [ ] `pnpm format:check` confirma formato consistente;
  - [ ] `pnpm typecheck` valida todos los workspaces sin emitir archivos;
  - [ ] imports no usados, tipos inseguros y errores básicos se reportan;
  - [ ] las reglas no permiten dependencias inversas evidentes entre capas, si la herramienta elegida lo permite sin complejidad prematura;
  - [ ] no se agrega runner de pruebas, cobertura ni CI antes de sus commits asignados;
  - [ ] este archivo queda actualizado al finalizar.
- **Fuera de alcance:** pruebas automatizadas, cobertura, CI, implementación funcional, dependencias de producto y publicación de paquetes.

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
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Las aplicaciones y paquetes todavía no contienen lógica funcional ni dependencias internas.

## 6. Contratos vigentes

| Contrato | Ubicación | Estado | Consumidores principales |
|---|---|---|---|
| Límites y dirección de dependencias | `docs/01_ARCHITECTURE_AND_COMPONENTS.md` | documented | todos los workspaces |
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
- [x] ignore rules iniciales.

## 8. Componentes en progreso

- [ ] línea base de calidad para lint, formatting y typecheck.

## 9. Pendientes priorizados

1. Configurar lint, formatting y typecheck.
2. Incorporar runner de pruebas, utilidades compartidas y cobertura.
3. Agregar la línea base de integración continua.
4. Iniciar los contratos centrales del modelo de grafo.

## 10. Decisiones vigentes

- ADR-001: usar un monorepo TypeScript con pnpm workspaces y sin orquestador adicional inicialmente.
- ADR-002: mantener el modelo canónico de grafo independiente de la persistencia concreta.
- ADR-003: operar local-first y requerir consentimiento explícito para transmitir código a servicios remotos.
- Decisión operativa del Commit 004: Node.js 22+ y pnpm 11.14.0 para el bootstrap.
- Decisión operativa del Commit 005: usar una versión publicable de TypeScript y no depender de `corepack enable` cuando pnpm ya esté disponible localmente.

## 11. Deuda y limitaciones conocidas

| ID | Descripción | Riesgo | Fase objetivo |
|---|---|---|---|
| LIMIT-004 | No existen todavía reglas de lint ni formatting. | medium | Commit 006 |
| LIMIT-005 | El script raíz de tests no ejecuta suites hasta incorporar el runner. | low | Commit 007 |
| LIMIT-006 | No existe CI ni validación automatizada en servidor. | medium | Commit 008 |
| LIMIT-007 | Persistencia, identidad estable y framework visual continúan pendientes de ADR específicos. | medium | Fases 2–7 |

## 12. Riesgos o bloqueos

- Ningún bloqueo de diseño activo.
- La primera instalación local debe generar y versionar `pnpm-lock.yaml` para cerrar reproducibilidad completa.
- El siguiente commit de calidad debe evitar introducir un orquestador adicional o reglas complejas que no aporten valor al scaffolding.

## 13. Comandos disponibles y validación

```bash
pnpm --version
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

- `build`: coordina los scripts de compilación de los workspaces.
- `typecheck`: valida los workspaces sin emitir archivos.
- `test`: existe como contrato raíz y no ejecutará suites hasta el Commit 006.
- Validación ejecutada en el entorno de generación: compilación y typecheck directo con `tsc` para cada uno de los 23 workspaces.
- Validación pendiente en entorno local con acceso al registro: `pnpm install`, `pnpm build`, `pnpm typecheck` y `pnpm test` usando pnpm 11.14.0.

## 14. Fixtures y datos de prueba

- Ninguno; `packages/testing-fixtures` contiene únicamente scaffolding.

## 15. Archivos clave para retomar

1. `CODESTELLATION_PROJECT_STATE.md`
2. `package.json`
3. `pnpm-workspace.yaml`
4. `tsconfig.base.json`
5. `CODESTELLATION_DECISIONS.md`
6. `docs/01_ARCHITECTURE_AND_COMPONENTS.md`
7. `docs/04_AI_DEVELOPMENT_PLAYBOOK.md`

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
- No agregar runner de pruebas ni CI dentro del siguiente commit de calidad.
- Actualizar este archivo al terminar cada commit.
- Registrar un ADR solamente para decisiones significativas.
- Entregar únicamente archivos nuevos o editados; no generar proyectos completos ni patches salvo solicitud explícita.
