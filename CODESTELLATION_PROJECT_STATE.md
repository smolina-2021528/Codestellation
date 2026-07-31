# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-30
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `docs(governance): add project state and decision records`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 0 completada; Fase 1 preparada
- **Estado general:** stable

## 2. Objetivo actual

Cerrar la fase de definición con un mecanismo breve y verificable para retomar el proyecto, registrar decisiones arquitectónicas y guiar cada commit asistido por IA. El siguiente objetivo es crear el monorepo compilable sin implementar todavía capacidades funcionales del producto.

## 3. Último commit completado

- **Commit:** `docs(governance): add project state and decision records`
- **Resultado:** se establecieron el estado operativo, el registro de ADR, las reglas de trabajo asistido por IA y la Definition of Done.
- **Validaciones:** enlaces Markdown internos comprobados; documentos requeridos presentes; próximo commit definido sin ambigüedad.
- **Limitaciones:** todavía no existen workspace, aplicaciones, paquetes, dependencias, scripts ejecutables ni pruebas automatizadas.

## 4. Próximo commit exacto

- **Commit sugerido:** `chore(repo): initialize codestellation monorepo`
- **Objetivo:** crear una base mínima de monorepo TypeScript que permita instalar, compilar y ejecutar scripts raíz sobre aplicaciones y paquetes vacíos.
- **Archivos o paquetes probables:**
  - `package.json`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `.gitignore`
  - `.npmrc`
  - `apps/api/`
  - `apps/cli/`
  - `apps/web/`
  - paquetes iniciales bajo `packages/`
- **Criterios de aceptación:**
  - [ ] una instalación limpia reconoce todos los workspaces;
  - [ ] existen scripts raíz de `build`, `test` y `typecheck`;
  - [ ] las aplicaciones y paquetes de scaffolding compilan sin lógica funcional;
  - [ ] no se agregan lint, formatter, runner de pruebas ni CI antes de sus commits asignados;
  - [ ] este archivo queda actualizado al finalizar.
- **Fuera de alcance:** implementación del grafo, ingesta, parsers, persistencia, interfaz funcional, lint, formatting, cobertura y CI.

## 5. Arquitectura implementada

```text
Repositorio documental
├── README.md
├── CODESTELLATION_PROJECT_STATE.md
├── CODESTELLATION_DECISIONS.md
└── docs/
    ├── 00_CODESTELLATION_MASTER_PLAN.md
    ├── 01_ARCHITECTURE_AND_COMPONENTS.md
    └── 04_AI_DEVELOPMENT_PLAYBOOK.md
```

La arquitectura de ejecución está definida, pero aún no materializada en código.

## 6. Contratos vigentes

| Contrato | Ubicación | Estado | Consumidores principales |
|---|---|---|---|
| Límites y dirección de dependencias | `docs/01_ARCHITECTURE_AND_COMPONENTS.md` | documented | futuros paquetes y aplicaciones |
| Flujo de trabajo por commit | `docs/04_AI_DEVELOPMENT_PLAYBOOK.md` | active | mantenedores y agentes de IA |
| Estado operativo | `CODESTELLATION_PROJECT_STATE.md` | active | siguiente sesión de desarrollo |
| Decisiones arquitectónicas | `CODESTELLATION_DECISIONS.md` | active | todos los componentes futuros |

## 7. Componentes completados

- [x] visión, problema, usuarios, alcance y MVP;
- [x] límites del sistema y flujos principales;
- [x] estrategia de continuidad mediante estado operativo;
- [x] registro inicial de decisiones arquitectónicas;
- [x] reglas de desarrollo asistido por IA;
- [x] Definition of Ready y Definition of Done.

## 8. Componentes en progreso

- [ ] ninguno; el próximo trabajo comienza con el bootstrap del monorepo.

## 9. Pendientes priorizados

1. Inicializar el monorepo TypeScript con pnpm workspaces.
2. Configurar lint, formatting y typecheck.
3. Incorporar runner de pruebas, utilidades compartidas y cobertura.
4. Agregar la línea base de integración continua.

## 10. Decisiones vigentes

- ADR-001: usar un monorepo TypeScript con pnpm workspaces y sin orquestador adicional inicialmente.
- ADR-002: mantener el modelo canónico de grafo independiente de la persistencia concreta.
- ADR-003: operar local-first y requerir consentimiento explícito para transmitir código a servicios remotos.

## 11. Deuda y limitaciones conocidas

| ID | Descripción | Riesgo | Fase objetivo |
|---|---|---|---|
| LIMIT-001 | No existe todavía una base ejecutable ni validaciones automatizadas. | medium | Fase 1 |
| LIMIT-002 | Versiones exactas de runtime y dependencias aún no están fijadas. | low | Commit 004 |
| LIMIT-003 | Persistencia, identidad estable y framework visual continúan pendientes de ADR específicos. | medium | Fases 2–7 |

## 12. Riesgos o bloqueos

- Ningún bloqueo activo.
- El bootstrap debe permanecer mínimo para no adelantar responsabilidades de los commits 005, 006 y 007.

## 13. Comandos verificados

Todavía no existen comandos de instalación, lint, typecheck, tests, build o ejecución local. Deben incorporarse y verificarse en la Fase 1.

## 14. Fixtures y datos de prueba

- Ninguno en esta fase documental.

## 15. Archivos clave para retomar

1. `CODESTELLATION_PROJECT_STATE.md`
2. `CODESTELLATION_DECISIONS.md`
3. `docs/00_CODESTELLATION_MASTER_PLAN.md`
4. `docs/01_ARCHITECTURE_AND_COMPONENTS.md`
5. `docs/04_AI_DEVELOPMENT_PLAYBOOK.md`

## 16. Configuración local necesaria

- **Runtime:** pendiente de fijar en el Commit 004.
- **Package manager:** pnpm, versión pendiente de fijar en el Commit 004.
- **Variables:** ninguna.
- **Servicios:** ninguno.
- **Puertos:** ninguno.

## 17. Notas para la siguiente IA

- Verificar los archivos reales antes de asumir que el estado sigue vigente.
- Trabajar únicamente el próximo commit exacto indicado en este documento.
- Mantener un solo objetivo lógico por commit.
- No adelantar lint, pruebas o CI dentro del bootstrap del monorepo.
- Actualizar este archivo al terminar cada commit.
- Registrar un ADR solamente para decisiones significativas.
- Entregar únicamente archivos nuevos o editados; no generar proyectos completos ni patches salvo solicitud explícita.
