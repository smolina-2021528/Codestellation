# Codestellation — Registro de decisiones arquitectónicas

Este documento mantiene las decisiones significativas que condicionan el diseño y la evolución de Codestellation. Una decisión aceptada permanece vigente hasta que otro ADR la reemplace explícitamente.

## Uso del registro

Crear o actualizar un ADR cuando se elija una tecnología central, cambie un límite arquitectónico, se modifique un contrato persistido, se acepte una limitación relevante o se altere una política de seguridad. Las decisiones triviales de implementación no requieren ADR.

## Índice

| ADR | Título | Estado | Fecha |
|---|---|---|---|
| ADR-001 | Monorepo TypeScript con pnpm workspaces | accepted | 2026-07-30 |
| ADR-002 | Modelo canónico de grafo independiente de persistencia | accepted | 2026-07-30 |
| ADR-003 | Operación local-first y consentimiento para servicios remotos | accepted | 2026-07-30 |

---

## ADR-001 — Monorepo TypeScript con pnpm workspaces

- **Estado:** accepted
- **Fecha:** 2026-07-30
- **Autores:** mantenedores de Codestellation
- **Supersede a:** ninguno
- **Supersedido por:** ninguno

### Contexto

El MVP necesita aplicaciones web, API y CLI, además de paquetes compartidos para contratos, grafo, ingesta, análisis, persistencia y contexto. Separar estos elementos en repositorios independientes aumentaría la coordinación, duplicaría configuración y dificultaría evolucionar contratos atómicamente durante las primeras fases.

### Fuerzas de decisión

- compartir tipos y contratos sin publicación externa;
- mantener límites explícitos entre aplicaciones y paquetes;
- instalación reproducible y eficiente;
- buena experiencia local en Windows, macOS y Linux;
- evitar infraestructura de orquestación prematura;
- facilitar commits pequeños que modifiquen productor y consumidor juntos.

### Opciones consideradas

#### Opción A — Repositorios independientes

Aísla cada componente, pero introduce versionado y publicación anticipados, dificulta cambios coordinados y aumenta el costo operativo del MVP.

#### Opción B — Monorepo con npm workspaces

Reduce herramientas externas y permite compartir paquetes, aunque ofrece menor control sobre instalaciones y enlaces de workspace para una base con muchos paquetes.

#### Opción C — Monorepo con pnpm workspaces

Proporciona workspaces explícitos, enlaces mediante `workspace:*`, instalación eficiente y una base suficiente sin exigir un orquestador adicional.

#### Opción D — Monorepo con Nx o Turborepo desde el inicio

Añade caché y orquestación, pero incorpora decisiones, configuración y dependencias que todavía no están justificadas por el tamaño del proyecto.

### Decisión

Codestellation se implementará inicialmente como un monorepo TypeScript administrado con pnpm workspaces. El bootstrap no incluirá Nx, Turborepo ni otro orquestador. Los scripts raíz coordinarán los workspaces mediante capacidades de pnpm hasta que exista evidencia de que caché, ejecución distribuida o un grafo de tareas adicional aportan valor.

### Consecuencias positivas

- contratos y consumidores pueden cambiar en un único commit;
- no se requiere publicar paquetes internos;
- la estructura coincide con los límites definidos en la arquitectura;
- el tooling inicial permanece pequeño y reemplazable.

### Consecuencias negativas

- todos los colaboradores deben disponer de pnpm;
- un cambio transversal puede afectar más de un workspace;
- la ausencia inicial de caché avanzada puede aumentar tiempos cuando el repositorio crezca.

### Riesgos y mitigaciones

- Divergencia de versiones de pnpm → fijar `packageManager` y usar Corepack en el Commit 004.
- Dependencias internas desordenadas → usar `workspace:*` y reglas de límites en el Commit 005.
- Scripts raíz lentos al crecer → revisar un orquestador solo con métricas reales.

### Impacto

- afecta la estructura raíz, aplicaciones, paquetes, scripts y CI;
- no define todavía versiones exactas de dependencias de producto;
- no modifica el modelo de datos ni la política de seguridad.

### Validación

El Commit 004 deberá demostrar una instalación limpia, detección de todos los workspaces y ejecución correcta de los scripts raíz de build, test y typecheck sobre scaffolding compilable.

### Revisión futura

Reconsiderar cuando los tiempos locales o de CI sean materialmente lentos, cuando existan tareas complejas dependientes entre sí o cuando la publicación independiente de paquetes sea necesaria.

---

## ADR-002 — Modelo canónico de grafo independiente de persistencia

- **Estado:** accepted
- **Fecha:** 2026-07-30
- **Autores:** mantenedores de Codestellation
- **Supersede a:** ninguno
- **Supersedido por:** ninguno

### Contexto

Codestellation necesita representar archivos, símbolos, paquetes, servicios, relaciones, evidencia, confianza y snapshots. La persistencia inicial debe poder evolucionar sin obligar a parsers, analizadores, el motor de contexto o la interfaz a depender de conceptos exclusivos de una base concreta.

### Fuerzas de decisión

- portabilidad;
- trazabilidad y versionado;
- pruebas aisladas;
- posibilidad de reconstrucción;
- cambios futuros de almacenamiento;
- límites claros entre análisis y persistencia.

### Opciones consideradas

#### Opción A — Usar directamente el modelo de la base de datos

Reduce mapeo inicial, pero acopla todo el núcleo a una tecnología y convierte una migración de almacenamiento en un cambio transversal.

#### Opción B — Definir un modelo canónico independiente

Introduce una capa explícita de contratos y adaptación, pero mantiene estable la semántica del producto y permite sustituir persistencia.

#### Opción C — Mantener modelos distintos por cada consumidor

Ofrece libertad local, aunque multiplica conversiones, inconsistencias y pérdida de trazabilidad.

### Decisión

Se definirá un modelo canónico versionado para nodos, aristas, procedencia, confianza e identidad. Los parsers y analizadores producirán entradas normalizadas; el graph builder validará y ensamblará; los adaptadores de almacenamiento traducirán el modelo sin exponer detalles de base a las capas superiores.

### Consecuencias positivas

- el núcleo puede probarse sin una base real;
- la persistencia inicial puede reemplazarse;
- los plugins comparten una salida estable;
- API, contexto y visualización consumen semántica común.

### Consecuencias negativas

- se requiere validación y mapeo adicional;
- cambios incompatibles exigen versión y estrategia de migración o reconstrucción;
- el modelo canónico debe evitar convertirse en una abstracción demasiado genérica.

### Riesgos y mitigaciones

- Modelo insuficiente → evolucionar mediante fixtures y casos reales, no por especulación.
- Acoplamiento encubierto a una base → mantener pruebas contractuales para adaptadores.
- Cambios incompatibles → versionar esquema y registrar ADR cuando corresponda.

### Impacto

- condiciona `contracts`, `graph-model`, parsers, analizadores, graph builder, stores, búsqueda, snapshots y exportadores;
- no selecciona todavía una tecnología de persistencia.

### Validación

Los commits 010–014 deberán definir contratos serializables, validación runtime, fixtures de compatibilidad y pruebas sin depender de una base concreta.

### Revisión futura

Revisar al implementar el primer adaptador de persistencia o cuando un caso real no pueda representarse sin perder semántica o procedencia.

---

## ADR-003 — Operación local-first y consentimiento para servicios remotos

- **Estado:** accepted
- **Fecha:** 2026-07-30
- **Autores:** mantenedores de Codestellation
- **Supersede a:** ninguno
- **Supersedido por:** ninguno

### Contexto

El producto analizará repositorios que pueden contener código privado, secretos, configuraciones internas y conocimiento empresarial. El motor de contexto podrá integrarse con proveedores de IA, pero esa integración no debe convertir la transmisión remota de código en un comportamiento implícito.

### Fuerzas de decisión

- privacidad del código;
- uso sin conexión;
- control del usuario;
- compatibilidad con distintos proveedores;
- seguridad y auditoría;
- adopción en repositorios privados.

### Opciones consideradas

#### Opción A — Servicio remoto obligatorio

Simplifica operación centralizada, pero impide el uso sin conexión y aumenta riesgos de privacidad, cumplimiento y dependencia de proveedor.

#### Opción B — Local-first con integraciones remotas explícitas

Mantiene análisis, almacenamiento, búsqueda y visualización locales por defecto; permite servicios remotos solamente mediante configuración y acción consciente del usuario.

#### Opción C — Modo híbrido automático

Podría optimizar capacidades, pero hace difícil anticipar qué datos salen del equipo y reduce la confianza del usuario.

### Decisión

Codestellation será local-first. Ningún código, contexto, grafo o telemetría se enviará a un servicio remoto por defecto. Toda integración remota deberá ser opcional, identificable, configurable y precedida por consentimiento explícito. El núcleo no dependerá de un proveedor de IA concreto.

### Consecuencias positivas

- el producto funciona sin conexión para sus capacidades principales;
- repositorios privados conservan control sobre sus datos;
- los proveedores remotos permanecen reemplazables;
- la política de privacidad es predecible y comprobable.

### Consecuencias negativas

- ciertas capacidades semánticas pueden ser menos potentes sin modelos remotos;
- la instalación local puede requerir más recursos;
- cada integración remota necesita controles, redacción y auditoría.

### Riesgos y mitigaciones

- Fuga accidental por logs o errores → mensajes seguros, redacción y pruebas negativas.
- Configuración ambigua → UI y CLI deben mostrar claramente destino y datos enviados.
- Telemetría invasiva → mantenerla desactivada por defecto y documentar retención.

### Impacto

- afecta ingesta, observabilidad, motor semántico, adaptadores de agentes, API, UI, configuración y seguridad;
- exige que la lógica determinística siga siendo útil sin servicios externos.

### Validación

Las pruebas de seguridad deberán confirmar que una instalación por defecto no realiza solicitudes remotas ni registra contenido sensible, y que cualquier proveedor externo requiere configuración explícita.

### Revisión futura

Revisar si se incorpora una modalidad cloud administrada, sin alterar la garantía local-first de la distribución local.

---

## Plantilla para nuevas decisiones

### ADR-XXX — Título

- **Estado:** proposed | accepted | superseded | rejected
- **Fecha:** YYYY-MM-DD
- **Autores:**
- **Supersede a:**
- **Supersedido por:**

#### Contexto

Problema, restricciones y evidencia que requieren una decisión.

#### Fuerzas de decisión

- seguridad;
- local-first;
- rendimiento;
- mantenibilidad;
- portabilidad;
- complejidad;
- licencias;
- experiencia de desarrollador;
- compatibilidad.

#### Opciones consideradas

Describir cada opción con ventajas, desventajas y evidencia.

#### Decisión

Elección y justificación.

#### Consecuencias positivas

- ...

#### Consecuencias negativas

- ...

#### Riesgos y mitigaciones

- Riesgo → mitigación.

#### Impacto

- paquetes;
- contratos;
- datos;
- migraciones;
- seguridad;
- pruebas;
- documentación.

#### Validación

Cómo se comprobará la decisión.

#### Revisión futura

Condición o fecha para reconsiderarla.
