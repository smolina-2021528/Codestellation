# Codestellation — Estado actual del proyecto

> Documento operativo. Debe actualizarse al terminar cada commit y conservar únicamente la información necesaria para continuar el desarrollo.

## 1. Identificación

- **Fecha de actualización:** 2026-07-31
- **Branch activa:** `ft-mvp1`
- **Último commit lógico:** `ci(repo): add continuous integration baseline`
- **Release objetivo:** Release 0.0 — Fundaciones / MVP 1
- **Fase del roadmap:** Fase 1 completada; Fase 2 lista para iniciar
- **Estado general:** stable scaffolding; quality, testing and CI baseline active

## 2. Objetivo actual

Mantener una base mínima, instalable, compilable y verificable de monorepo TypeScript con validación local y remota. El objetivo inmediato ahora es iniciar los contratos canónicos sin agregar todavía lógica funcional de análisis, almacenamiento, API, CLI o web.

## 3. Último commit completado

- **Commit:** `ci(repo): add continuous integration baseline`
- **Resultado:** se agregó la primera línea base de GitHub Actions para validar el monorepo en servidor remoto.
- **Workflow:** `.github/workflows/ci.yml`.
- **Ramas cubiertas:** `main`, `develop`, ramas `ft-*`, ramas `feature/**` en push y pull requests hacia ramas principales o de feature relevante.
- **Runtime:** Node.js 22.x y pnpm 11.14.0.
- **Validaciones remotas:** instalación con lockfile, `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`.
- **Permisos:** lectura mínima de contenidos del repositorio.
- **Concurrencia:** cancelación de ejecuciones anteriores para la misma rama o pull request.
- **Limitaciones:** todavía no existen coverage thresholds, artefactos publicados, análisis de seguridad ni matrices adicionales de sistema operativo.

## 4. Próximo commit exacto

- **Commit sugerido:** `feat(contracts): define project source and snapshot identifiers`
- **Objetivo:** definir los identificadores base que usarán el resto de paquetes para referirse de forma estable a proyectos, fuentes, archivos, revisiones y snapshots.
- **Archivos o paquetes probables:**
  - `packages/contracts/src/index.ts`;
  - `packages/contracts/src/ids.ts`;
  - `packages/contracts/test/ids.test.ts`;
  - `README.md`;
  - `CODESTELLATION_PROJECT_STATE.md`.
- **Criterios esperados:**
  - identificadores serializables como strings;
  - marcas nominales de TypeScript para evitar mezclar IDs;
  - helpers para crear y validar IDs;
  - tests para casos válidos e inválidos;
  - ningún paquete debe depender todavía de persistencia concreta.

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

## 7. Riesgos conocidos

- El proyecto depende de `pnpm-lock.yaml` para que CI pueda instalar con `--frozen-lockfile`; si el lockfile no fue generado localmente, debe generarse y versionarse antes de esperar CI verde.
- TypeScript 7 puede requerir ajustes finos cuando se incorporen patrones más complejos.
- El boundary checker todavía es intencionalmente simple y puede necesitar mejoras cuando aparezcan imports de subpaths.
- La línea base no usa ESLint ni Prettier; el formato se protege con un script propio mínimo.
- La cobertura no tiene umbrales hasta que existan módulos funcionales.

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
- `packages/testing-fixtures/src/index.ts`
