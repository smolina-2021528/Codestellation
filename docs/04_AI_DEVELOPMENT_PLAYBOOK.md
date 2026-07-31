# Codestellation — Manual para desarrollar el proyecto con una IA

## 1. Propósito

Este documento define cómo trabajar con una IA de desarrollo para construir Codestellation sin perder contexto, introducir cambios arbitrarios ni acumular documentación desactualizada.

Debe colocarse en el repositorio y entregarse al agente al iniciar cada nueva sesión.

---

## 2. Regla de inicio de sesión

Antes de escribir código, la IA debe leer en este orden:

1. `README.md`;
2. `docs/00_CODESTELLATION_MASTER_PLAN.md`;
3. `CODESTELLATION_PROJECT_STATE.md`;
4. `CODESTELLATION_DECISIONS.md`;
5. documentación específica de la épica actual;
6. archivos relacionados por el grafo o por búsqueda.

La IA no debe releer toda la documentación si el estado del proyecto contiene un resumen suficiente y referencias exactas.

---

## 3. Prompt base sugerido para una IA de desarrollo

```text
Estás desarrollando Codestellation, una plataforma que transforma repositorios en una constelación navegable de conocimiento técnico y genera contexto selectivo para agentes de IA.

Antes de modificar código:
1. Lee el plan maestro, el estado actual y las decisiones vigentes.
2. Identifica el alcance exacto del commit solicitado.
3. Localiza contratos, consumidores, pruebas y convenciones relacionadas.
4. No modifiques elementos fuera del alcance sin explicar una necesidad técnica real.
5. Distingue claramente hechos comprobados, suposiciones y decisiones nuevas.
6. Mantén la arquitectura por capas y los límites de paquetes.
7. Agrega o actualiza pruebas.
8. Ejecuta las validaciones disponibles.
9. Actualiza CODESTELLATION_PROJECT_STATE.md al terminar.
10. Si se tomó una decisión arquitectónica, registra un ADR.

Entrega un único commit lógico, pequeño y verificable. No combines refactors no relacionados con una feature o fix.
```

---

## 4. Unidad de trabajo

Cada tarea debe producir un **commit lógico**.

Un commit lógico:

- tiene un objetivo único;
- puede revisarse de forma aislada;
- incluye pruebas relacionadas;
- no mezcla formateos globales;
- actualiza documentación solo cuando corresponde;
- deja el proyecto en un estado ejecutable o explícitamente marcado como scaffolding.

### Tamaño recomendado

Preferir:

- 1 contrato;
- 1 capacidad;
- 1 migración;
- 1 integración;
- 1 corrección;
- 1 slice vertical pequeño.

Evitar “implementar toda la plataforma” en un solo cambio.

---

## 5. Formato de solicitud de commit

```markdown
## Objetivo

[Resultado observable]

## Alcance

- [Incluido]
- [Incluido]

## Fuera de alcance

- [No incluido]

## Criterios de aceptación

- [ ] ...
- [ ] ...

## Validaciones

- [Comando o prueba]

## Commit sugerido

`feat(scope): descripción`
```

---

## 6. Flujo obligatorio de la IA

### Fase 1 — Orientación

La IA debe identificar:

- estado actual;
- commit objetivo;
- módulos relacionados;
- contratos afectados;
- decisiones vigentes;
- pruebas disponibles;
- riesgos.

### Fase 2 — Inspección focalizada

Debe leer:

- archivos a modificar;
- interfaces o contratos;
- consumidores directos;
- pruebas;
- configuración relevante.

No debe hacer una exploración ilimitada si el alcance ya es claro.

### Fase 3 — Plan interno del commit

Debe definir:

1. archivos nuevos;
2. archivos editados;
3. comportamiento esperado;
4. pruebas;
5. migraciones;
6. compatibilidad;
7. documentación.

### Fase 4 — Implementación

Reglas:

- seguir estilo existente;
- evitar abstracciones prematuras;
- manejar errores;
- usar tipos explícitos en contratos;
- no ocultar warnings;
- no crear dependencias circulares;
- mantener funciones pequeñas;
- conservar trazabilidad.

### Fase 5 — Validación

Ejecutar, según corresponda:

- typecheck;
- lint;
- unit tests;
- integration tests;
- build;
- migraciones;
- prueba de CLI;
- fixture end-to-end.

Si algo no puede ejecutarse, registrar la causa exacta.

### Fase 6 — Cierre

Actualizar:

- estado del proyecto;
- lista de archivos;
- validaciones;
- riesgos;
- próximo commit;
- ADR si aplica.

---

## 7. Reglas arquitectónicas para la IA

1. `contracts` no depende de implementaciones.
2. `graph-model` no depende de UI, API ni parsers concretos.
3. Los parsers producen el modelo canónico.
4. Los analizadores no escriben directamente en la base.
5. `graph-builder` valida antes de persistir.
6. El almacenamiento se consume mediante interfaces.
7. La interfaz web no accede directamente a la base.
8. El contexto para IA no depende de un proveedor específico.
9. Las inferencias nunca sobrescriben hechos confirmados.
10. Todo dato derivado debe tener provenance.
11. No se ejecuta código del repositorio analizado sin sandbox y permiso.
12. Las actualizaciones incrementales deben ser idempotentes.

---

## 8. Reglas de contratos

Antes de implementar un nuevo componente:

- definir su entrada y salida;
- documentar errores;
- definir cancelación y timeout si aplica;
- incluir versión cuando el formato se persiste;
- evitar `any` en límites públicos;
- validar datos externos;
- distinguir IDs de entidades.

Ejemplo:

```ts
type ProjectId = string & { readonly __brand: "ProjectId" };
type SnapshotId = string & { readonly __brand: "SnapshotId" };
```

No es obligatorio usar branding exactamente así, pero se deben evitar confusiones entre identificadores.

---

## 9. Reglas de errores

Cada capa debe tener errores estructurados.

Categorías:

- validation;
- source_access;
- unsupported_input;
- parser;
- analysis;
- persistence;
- query;
- security;
- provider;
- internal.

Un error debe incluir:

- código;
- mensaje seguro;
- causa opcional;
- contexto no sensible;
- posibilidad de retry;
- correlation ID.

No se deben ignorar excepciones silenciosamente.

---

## 10. Reglas de pruebas

### Para contratos

- validación;
- serialización;
- compatibilidad.

### Para parsers

- fixture mínimo;
- fixture con errores;
- rangos;
- imports;
- símbolos;
- snapshot esperado.

### Para graph builder

- deduplicación;
- identidad;
- nodos inválidos;
- relaciones inválidas;
- transacción.

### Para context engine

- selección por intención;
- límites;
- presupuesto;
- razones;
- no incluir archivos protegidos;
- comportamiento sin resultados.

### Para incremental update

- modificar;
- agregar;
- eliminar;
- mover;
- renombrar;
- cambiar configuración global.

### Regla

No usar snapshots gigantes opacos como única prueba. Deben existir assertions sobre semántica importante.

---

## 11. Reglas para cambios de esquema

Todo cambio del esquema del grafo requiere:

1. versión nueva;
2. migración o estrategia de reconstrucción;
3. compatibilidad de lectores;
4. actualización de fixtures;
5. documentación;
6. ADR si es incompatible.

---

## 12. Reglas para dependencias

Antes de agregar una librería, la IA debe justificar:

- problema resuelto;
- por qué no usar plataforma estándar;
- mantenimiento;
- licencia;
- peso;
- compatibilidad local;
- riesgo de seguridad;
- alternativa.

No actualizar dependencias no relacionadas en el mismo commit.

---

## 13. Reglas para seguridad

- no registrar secretos;
- no imprimir contenido completo por defecto;
- no ejecutar scripts de repositorios;
- validar ZIP y rutas;
- usar permisos mínimos;
- sanitizar HTML y Markdown;
- bloquear URLs internas cuando haya fetch remoto;
- limitar tamaños y tiempos;
- mantener telemetría desactivable;
- incluir pruebas negativas.

---

## 14. Reglas para documentación viva

Después de cada commit, revisar si cambió:

- arquitectura;
- contrato;
- comando CLI;
- configuración;
- modelo de datos;
- flujo de usuario;
- criterio de aceptación.

No actualizar documentos por rutina si no hubo cambio real.

---

## 15. `CODESTELLATION_PROJECT_STATE.md`

Debe contener solo el estado actual necesario para continuar, no un diario interminable.

Incluye:

- revisión actual;
- fase;
- completado;
- en progreso;
- decisiones vigentes;
- comandos de validación;
- arquitectura implementada;
- deuda conocida;
- próximo commit;
- archivos clave.

Al crecer, mover historia detallada a releases o changelog.

---

## 16. Registro de decisiones

Crear un ADR cuando:

- se elige almacenamiento;
- cambia el modelo canónico;
- se agrega un servicio;
- se introduce una dependencia central;
- se cambia estrategia de identidad;
- se decide local-first vs cloud;
- se cambia protocolo de agentes;
- se acepta una limitación importante.

No crear ADR para decisiones triviales de implementación.

---

## 17. Formato de respuesta de la IA después de un commit

```markdown
## Commit

`feat(scope): descripción`

## Resultado

[Qué quedó funcionando]

## Archivos

- `ruta`: cambio

## Validaciones

- `comando`: resultado

## Decisiones

- [Ninguna / ADR-XXX]

## Riesgos o limitaciones

- ...

## Próximo commit recomendado

`...`
```

Por defecto, las entregas de este proyecto deben contener únicamente los archivos nuevos o editados del commit. No se debe generar el proyecto completo ni un patch, salvo solicitud explícita del usuario.

Si el usuario solicita un formato todavía más reducido, la IA debe respetarlo y mantener el resumen mínimo.

---

## 18. Estrategia de ramas

Para el desarrollo guiado por commits pequeños:

- `main`: versión estable y lista para release;
- `develop`: integración de trabajo validado antes de promoverlo a `main`;
- `ft-mvp1`: rama activa para construir el MVP 1;
- ramas futuras `ft-mvp2` y `ft-mvp3`: se crean desde una base estable al iniciar cada MVP;
- commits convencionales y atómicos;
- PR pequeñas hacia `develop`;
- promoción a `main` únicamente después de validar el hito correspondiente.

Convención:

```text
feat(parser): ...
fix(graph): ...
refactor(context): ...
test(indexing): ...
docs(architecture): ...
chore(tooling): ...
perf(query): ...
security(ingestion): ...
```

---

## 19. Definition of Ready

Una tarea está lista cuando:

- tiene objetivo observable;
- se conocen límites;
- hay criterios de aceptación;
- se identificaron dependencias;
- se conoce cómo validar;
- no depende de una decisión sin resolver.

---

## 20. Definition of Done

Un commit está terminado cuando:

- implementa el alcance;
- compila;
- pasa pruebas aplicables;
- maneja errores;
- no introduce warnings ignorados;
- actualiza contratos y documentación necesarios;
- actualiza estado;
- registra decisiones;
- deja próximo paso claro.

---

## 21. Instrucción para retomar el proyecto en otra conversación

Entregar a la IA:

1. ZIP o repositorio actual;
2. `CODESTELLATION_PROJECT_STATE.md`;
3. último ADR o decisiones;
4. tarea siguiente;
5. regla de producir un solo commit.

Prompt sugerido:

```text
Comprende el proyecto Codestellation usando el estado y las decisiones incluidas. Verifica el código antes de asumir que la documentación sigue vigente. Trabaja únicamente el próximo commit indicado. Devuelve solo archivos nuevos o editados y actualiza el estado del proyecto.
```

---

## 22. Antipatrones para la IA

- reescribir módulos completos sin necesidad;
- inventar archivos que no existen;
- asumir versiones;
- cambiar stack sin ADR;
- crear abstracciones genéricas antes de tener dos usos;
- mezclar UI, persistencia y análisis;
- confiar solo en nombres para afirmar flujos;
- borrar warnings en vez de resolverlos;
- desactivar pruebas;
- editar archivos generados;
- incluir secretos en fixtures;
- declarar éxito sin ejecutar validaciones disponibles;
- dejar `TODO` sin registrar en el estado.

---

## 23. Regla final

La IA debe actuar como mantenedor del sistema, no como generador aislado de código. Cada cambio debe preservar comprensión, trazabilidad y capacidad de continuar el trabajo en otra sesión.

