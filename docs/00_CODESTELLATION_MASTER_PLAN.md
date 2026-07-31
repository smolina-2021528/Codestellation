# Codestellation — Plan maestro del producto y del proyecto

## 1. Definición

**Codestellation** es una plataforma de comprensión de software que transforma repositorios en una **constelación navegable, jerárquica y dinámica de conocimiento técnico**.

La plataforma sirve simultáneamente como:

1. mapa visual para comprender proyectos;
2. memoria persistente del sistema;
3. índice semántico y estructural del código;
4. motor de selección de contexto para agentes de IA;
5. herramienta de análisis de impacto;
6. generador de documentación viva;
7. plano de arquitectura para proyectos nuevos;
8. capa de colaboración entre desarrolladores humanos e IA.

La idea no es representar únicamente archivos o imports. Codestellation debe explicar **cómo funciona realmente el sistema**, desde el nivel de producto hasta el nivel de código.

---

## 2. Problema que resuelve

### 2.1 Para desarrolladores

Un desarrollador que entra a un proyecto existente suele enfrentar:

- cientos o miles de archivos;
- documentación incompleta o desactualizada;
- arquitectura implícita;
- servicios conectados de formas poco evidentes;
- múltiples frameworks, repositorios o lenguajes;
- dificultad para encontrar el punto de entrada de una funcionalidad;
- temor de romper consumidores desconocidos;
- tiempo excesivo de onboarding;
- dependencia de pocas personas que conocen el sistema.

### 2.2 Para vibecoders y equipos pequeños

Quien desarrolla principalmente con IA suele tener dificultades adicionales:

- la IA modifica archivos aislados sin ver el panorama completo;
- cada conversación reconstruye parte del contexto;
- se repiten exploraciones y lecturas;
- las decisiones previas se pierden;
- crece la deuda técnica sin una representación visible;
- se crean soluciones duplicadas;
- se rompen contratos y convenciones no escritas;
- el consumo de tokens aumenta a medida que el proyecto crece.

### 2.3 Para agentes de inteligencia artificial

Los modelos no trabajan naturalmente con una memoria completa y permanente de un repositorio. En cada tarea necesitan decidir:

- qué archivos leer;
- qué fragmentos son relevantes;
- cuáles son los consumidores del código a modificar;
- qué reglas arquitectónicas aplicar;
- qué pruebas ejecutar;
- qué información previa conservar.

Sin una capa intermedia, la IA suele depender de búsqueda textual, exploración de carpetas y reconstrucción parcial del sistema.

### 2.4 Para organizaciones

Las empresas enfrentan:

- conocimiento concentrado en personas específicas;
- documentación manual costosa;
- onboarding lento;
- análisis de impacto incompleto;
- auditorías técnicas difíciles;
- dependencia de herramientas separadas;
- riesgo al modernizar sistemas legacy;
- pérdida de conocimiento tras rotación de personal.

---

## 3. Propuesta de valor

Codestellation convierte un proyecto en un modelo navegable y consultable donde cada elemento conoce:

- qué es;
- dónde está;
- qué responsabilidad tiene;
- qué utiliza;
- quién lo utiliza;
- en qué flujo funcional participa;
- qué reglas y decisiones lo afectan;
- qué pruebas lo cubren;
- qué podría romperse si cambia;
- qué fragmentos necesita una IA para trabajar con él.

### Propuesta resumida

> Codestellation permite que humanos e inteligencias artificiales comprendan y modifiquen sistemas de software utilizando una representación viva, visual y contextual del proyecto.

### Diferenciador principal

La mayoría de herramientas se enfoca en una sola vista:

- dependencias entre archivos;
- arquitectura;
- documentación;
- búsqueda semántica;
- chat con repositorio;
- análisis de impacto;
- diagramas.

Codestellation combina estas capacidades alrededor de un **grafo de conocimiento versionado e incremental**.

---

## 4. Visión del producto

### 4.1 La constelación

La interfaz principal será una constelación de nodos y relaciones. El usuario podrá:

- acercarse y alejarse;
- arrastrar nodos;
- expandir grupos;
- ocultar categorías;
- seguir una conexión;
- buscar entidades;
- seleccionar un flujo funcional;
- cambiar de perspectiva;
- abrir código y documentación;
- pedir una explicación a la IA;
- generar contexto para una tarea;
- visualizar el radio de impacto de un cambio.

### 4.2 Navegación por niveles

La misma información debe poder explorarse desde varios niveles.

#### Nivel 0 — Producto o ecosistema

```text
Plataforma de comercio
├── Aplicación web
├── API
├── Servicio de autenticación
├── Servicio de inventario
├── Servicio de pagos
├── Base de datos
└── Infraestructura
```

#### Nivel 1 — Aplicaciones y servicios

```text
Servicio de inventario
├── Catálogo
├── Existencias
├── Reservas
├── Movimientos
└── Integraciones
```

#### Nivel 2 — Módulos y capacidades

```text
Reservas
├── Crear reserva
├── Liberar reserva
├── Expirar reserva
├── Validar disponibilidad
└── Emitir evento
```

#### Nivel 3 — Flujo funcional

```text
Botón Reservar
→ hook useReservation
→ reservationClient
→ POST /reservations
→ ReservationController
→ ReservationService
→ StockRepository
→ inventory_reservations
→ ReservationCreated
```

#### Nivel 4 — Símbolos y código

```text
createReservation()
validateAvailableStock()
lockInventoryRows()
persistReservation()
publishReservationCreated()
```

#### Nivel 5 — Fragmentos relevantes

El sistema puede abrir líneas específicas del código, contratos, pruebas o configuración.

---

## 5. Principios fundamentales

### 5.1 La evidencia debe ser distinguible de la inferencia

Codestellation manejará tres clases de conocimiento:

1. **Confirmado:** derivado directamente de AST, configuración, manifiestos, archivos o ejecución controlada.
2. **Inferido:** interpretado por reglas heurísticas o IA.
3. **Humano:** agregado, validado o corregido por desarrolladores.

Nunca debe presentar una inferencia como hecho comprobado.

### 5.2 El análisis debe ser incremental

No se debe reconstruir el proyecto completo después de cada commit. La actualización ideal usa:

- commit anterior;
- diff actual;
- archivos agregados, modificados y eliminados;
- símbolos afectados;
- relaciones dependientes;
- subgrafos que necesitan recalcularse.

### 5.3 El producto debe funcionar sin depender de una IA específica

El núcleo debe operar con:

- ChatGPT;
- Claude;
- Gemini;
- agentes IDE;
- modelos locales;
- ejecución sin LLM para análisis determinístico.

Las integraciones con modelos deben implementarse mediante adaptadores.

### 5.4 El modo local es un requisito estratégico

Los repositorios privados pueden contener secretos, propiedad intelectual y datos sensibles. Codestellation debe ofrecer una ruta completamente local para:

- escaneo;
- parsing;
- almacenamiento;
- visualización;
- búsqueda;
- integración con modelos locales.

### 5.5 El usuario controla la profundidad

La constelación no debe mostrar miles de nodos a la vez. Debe usar:

- agrupación;
- expansión progresiva;
- niveles de zoom;
- filtros;
- vistas por tarea;
- límites configurables;
- resumen de clústeres.

### 5.6 El contexto para IA debe ser verificable

Cada paquete de contexto debe explicar:

- por qué se incluyó cada nodo o fragmento;
- qué relación tiene con la tarea;
- qué información fue excluida;
- qué nivel de confianza tiene;
- qué riesgos o huecos existen.

### 5.7 El grafo no reemplaza el código

El código fuente sigue siendo la verdad primaria. El grafo es una representación derivada y versionada.

---

## 6. Usuarios objetivo

### 6.1 Desarrollador nuevo en un proyecto

Necesita:

- visión general;
- rutas de aprendizaje;
- flujos principales;
- módulos críticos;
- convenciones;
- responsables;
- puntos de entrada.

### 6.2 Vibecoder

Necesita:

- contexto automático para la IA;
- advertencias de impacto;
- reglas arquitectónicas;
- checklist de validación;
- evidencia visual de qué está cambiando.

### 6.3 Desarrollador senior o arquitecto

Necesita:

- dependencias;
- límites de dominio;
- deuda técnica;
- ciclos;
- puntos de acoplamiento;
- análisis cross-repository;
- cumplimiento arquitectónico.

### 6.4 Líder técnico

Necesita:

- onboarding;
- cobertura de documentación;
- componentes críticos;
- riesgo de concentración;
- progreso de modernización;
- visibilidad del sistema.

### 6.5 Agente de IA

Necesita:

- contexto mínimo suficiente;
- contratos relevantes;
- archivos editables;
- archivos de solo lectura;
- reglas del proyecto;
- pruebas relacionadas;
- alcance permitido;
- estado actual del repositorio.

### 6.6 Auditor o consultor

Necesita:

- mapa del sistema;
- dependencias externas;
- seguridad;
- flujos de datos;
- infraestructura;
- componentes obsoletos;
- evidencia rastreable.

---

## 7. Casos de uso prioritarios

### CU-01 — Importar un repositorio

El usuario proporciona:

- URL Git;
- ZIP;
- carpeta local;
- repositorio ya clonado;
- monorepo;
- conjunto de repositorios relacionados.

El sistema detecta el tipo de proyecto y crea un primer mapa.

### CU-02 — Comprender una funcionalidad

El usuario busca “inicio de sesión”. Codestellation devuelve:

- nodo funcional;
- componentes de UI;
- servicios;
- endpoints;
- modelos;
- base de datos;
- pruebas;
- configuración;
- flujo visual.

### CU-03 — Preparar contexto para una IA

El usuario solicita:

> Agregar recuperación de contraseña.

Codestellation selecciona el subgrafo necesario y produce un paquete de contexto con archivos y fragmentos.

### CU-04 — Analizar impacto

Antes de modificar una entidad, el usuario puede ver:

- consumidores directos;
- consumidores indirectos;
- endpoints;
- contratos públicos;
- pruebas;
- migraciones;
- riesgos.

### CU-05 — Actualizar después de un commit

Codestellation toma el diff y recalcula únicamente los nodos y relaciones afectados.

### CU-06 — Generar documentación

Produce:

- panorama general;
- arquitectura;
- catálogo de módulos;
- catálogo de APIs;
- diagramas de flujo;
- dependencias;
- onboarding;
- glosario técnico y funcional.

### CU-07 — Diseñar un proyecto desde cero

El usuario describe el sistema. Codestellation crea una constelación planificada con:

- dominios;
- componentes;
- servicios;
- APIs;
- datos;
- infraestructura;
- milestones;
- dependencias.

La IA desarrolla nodo por nodo manteniendo coherencia con el plano.

### CU-08 — Explorar múltiples repositorios

Permite seguir conexiones entre:

- frontend y backend;
- microservicios;
- librerías compartidas;
- contratos;
- eventos;
- infraestructura;
- repositorios de documentación.

---

## 8. Alcance funcional completo

### 8.1 Ingesta

- Git local;
- Git remoto;
- ZIP;
- carpeta;
- múltiples raíces;
- ramas;
- tags;
- commit específico;
- exclusiones configurables;
- repositorios privados mediante credenciales seguras.

### 8.2 Detección

- lenguajes;
- frameworks;
- administradores de paquetes;
- aplicaciones y paquetes;
- entrypoints;
- módulos;
- configuraciones;
- variables de entorno declaradas;
- contenedores;
- pipelines;
- esquemas de datos;
- endpoints;
- eventos;
- colas;
- pruebas;
- documentación.

### 8.3 Análisis estructural

- árbol de archivos;
- símbolos;
- imports y exports;
- llamadas;
- herencia;
- implementación de interfaces;
- uso de tipos;
- rutas;
- dependencias de paquetes;
- consultas a datos;
- relaciones entre pruebas y código.

### 8.4 Análisis semántico

- propósito probable;
- agrupación por capacidades;
- flujos funcionales;
- conceptos de negocio;
- puntos de entrada;
- módulos críticos;
- riesgos;
- deuda técnica;
- duplicación conceptual.

### 8.5 Visualización

- grafo jerárquico;
- constelación libre;
- vista por capas;
- vista de flujo;
- vista de dependencias;
- vista de impacto;
- vista temporal;
- vista de infraestructura;
- vista de datos;
- vista de seguridad.

### 8.6 Contexto para IA

- selección automática;
- selección manual;
- presupuesto de tokens;
- resúmenes jerárquicos;
- fragmentos de código;
- reglas del proyecto;
- decisiones arquitectónicas;
- pruebas;
- restricciones;
- exportación Markdown y JSON;
- integración por CLI, API y MCP o protocolo equivalente.

### 8.7 Colaboración

- notas;
- etiquetas;
- validación humana;
- responsables;
- comentarios;
- enlaces a incidencias;
- decisiones;
- rutas de onboarding;
- marcadores.

### 8.8 Historial

- snapshots por commit;
- evolución de nodos;
- relaciones agregadas o eliminadas;
- comparación de arquitectura;
- detección de deriva arquitectónica;
- regresiones de dependencias.

---

## 9. Fuera de alcance inicial

No debe intentarse en el primer MVP:

- soportar todos los lenguajes;
- inferir todos los flujos de negocio automáticamente;
- ejecutar código no confiable sin sandbox;
- reemplazar IDEs completos;
- hacer edición visual bidireccional de cualquier lenguaje;
- garantizar análisis perfecto en metaprogramación dinámica;
- analizar binarios cerrados;
- desplegar cambios directamente a producción;
- convertirse en plataforma completa de gestión de proyectos.

---

## 10. MVP recomendado

### 10.1 Objetivo

Demostrar que Codestellation puede convertir un repositorio real en un grafo navegable y generar contexto útil para una tarea de desarrollo.

### 10.2 Alcance del MVP

#### Entradas

- carpeta local;
- ZIP;
- URL Git pública;
- rama configurable.

#### Lenguajes

- TypeScript;
- JavaScript;
- JSON y archivos de configuración relacionados.

#### Frameworks prioritarios

- Node.js genérico;
- React;
- Next.js;
- Express o estructura HTTP equivalente.

#### Entidades mínimas

- repository;
- workspace/package;
- directory;
- file;
- module;
- class;
- function;
- method;
- component;
- route;
- endpoint;
- test;
- dependency;
- configuration.

#### Relaciones mínimas

- contains;
- imports;
- exports;
- calls;
- renders;
- routes_to;
- handles;
- tests;
- depends_on;
- configures.

#### Interfaz

- lienzo con zoom y paneo;
- nodos arrastrables;
- expansión y contracción;
- búsqueda;
- filtros por tipo;
- panel de detalles;
- vista del código;
- dependencias entrantes y salientes;
- ruta entre dos nodos;
- modo “contexto para tarea”.

#### Persistencia

- almacenamiento de proyectos;
- snapshot por commit;
- grafo persistente;
- reindexación incremental básica.

#### Exportación

- paquete JSON;
- paquete Markdown;
- lista de archivos y rangos relevantes;
- resumen de impacto.

### 10.3 Demostración objetivo

Con un repositorio de ejemplo, el usuario debe poder:

1. importarlo;
2. observar el mapa de alto nivel;
3. buscar una funcionalidad;
4. expandir el flujo;
5. seleccionar una tarea;
6. generar el paquete de contexto;
7. entregar ese paquete a una IA;
8. realizar un cambio;
9. reindexar el commit;
10. visualizar cómo cambió la constelación.

---

## 11. Producto completo por etapas

### Etapa A — Mapa estructural

- ingesta;
- parsing;
- símbolos;
- imports;
- grafo;
- visualización básica.

### Etapa B — Contexto para IA

- búsqueda híbrida;
- selección de subgrafo;
- presupuesto de tokens;
- paquetes de contexto;
- adaptadores para agentes.

### Etapa C — Flujos funcionales

- detección de endpoints;
- trazado UI → API → datos;
- relaciones semánticas;
- validación humana.

### Etapa D — Impacto y calidad

- blast radius;
- ciclos;
- deuda;
- cobertura;
- contratos públicos;
- reglas arquitectónicas.

### Etapa E — Multilenguaje y multirepo

- Java;
- Python;
- C#;
- Go;
- repositorios relacionados;
- eventos distribuidos.

### Etapa F — Colaboración y empresa

- permisos;
- equipos;
- comentarios;
- auditoría;
- SSO;
- políticas;
- despliegue empresarial.

---

## 12. Estrategia de integración con IA

Codestellation debe ofrecer varias superficies.

### 12.1 CLI

Ejemplos conceptuales:

```bash
codestellation index ./project
codestellation explain auth/login
codestellation context "agregar recuperación de contraseña"
codestellation impact src/auth/token.ts
codestellation update --from HEAD~1 --to HEAD
```

### 12.2 API local

La IA puede consultar:

- búsqueda de nodos;
- vecinos;
- subgrafo;
- contexto por tarea;
- archivo o símbolo;
- impacto;
- reglas;
- estado del índice.

### 12.3 Servidor para herramientas de IA

Un adaptador debe exponer operaciones simples:

- `search_project`;
- `get_node`;
- `get_neighbors`;
- `get_flow`;
- `build_context`;
- `get_impact`;
- `get_project_rules`;
- `update_index`.

### 12.4 Archivo de instrucciones del proyecto

Codestellation puede generar archivos para agentes, por ejemplo:

- `CODESTELLATION_CONTEXT.md`;
- `CODESTELLATION_RULES.md`;
- `CODESTELLATION_PROJECT_STATE.md`;
- manifiesto JSON del grafo;
- resumen de arquitectura.

### 12.5 Contexto adaptativo

La IA no debe recibir siempre el mismo paquete. Debe construirse según:

- intención;
- archivos objetivo;
- tipo de tarea;
- presupuesto;
- profundidad;
- riesgo;
- lenguaje;
- historial reciente.

---

## 13. Estrategia de monetización posible

Esta sección es opcional para el desarrollo inicial, pero ayuda a diseñar límites.

### Edición Community

- open source;
- local;
- repositorios públicos o locales;
- análisis estructural;
- visualización;
- exportación básica.

### Edición Pro

- integración con proveedores de IA;
- análisis semántico avanzado;
- múltiples proyectos;
- historial extendido;
- flujos funcionales;
- automatización.

### Edición Team

- colaboración;
- notas compartidas;
- permisos;
- rutas de onboarding;
- comentarios;
- integraciones con GitHub/GitLab.

### Edición Enterprise

- despliegue privado;
- SSO;
- auditoría;
- políticas;
- retención configurable;
- soporte multirepo;
- conectores internos;
- modelos privados.

Una alternativa válida es mantener el núcleo abierto y monetizar:

- hosting;
- colaboración;
- análisis avanzado;
- conectores empresariales;
- soporte.

---

## 14. Métricas de éxito

### Producto

- tiempo hasta primer mapa útil;
- tiempo para localizar una funcionalidad;
- porcentaje de nodos con explicación útil;
- porcentaje de relaciones confirmadas;
- tasa de consultas resueltas sin abrir manualmente archivos;
- satisfacción del onboarding.

### IA

- reducción de tokens por tarea;
- archivos leídos antes de un cambio;
- tasa de cambios correctos al primer intento;
- regresiones evitadas;
- precisión de selección de contexto;
- uso de contexto descartado.

### Ingeniería

- tiempo de indexación inicial;
- tiempo de actualización incremental;
- memoria por millón de relaciones;
- latencia de búsqueda;
- latencia de expansión de nodo;
- cobertura de parsers;
- tasa de falsos enlaces.

### Negocio

- proyectos activos;
- repositorios indexados;
- usuarios que regresan;
- equipos que invitan colaboradores;
- retención por cohorte;
- conversión a edición pagada.

---

## 15. Riesgos principales

### Riesgo: grafo demasiado grande

Mitigaciones:

- agrupación jerárquica;
- carga progresiva;
- filtros;
- vistas por intención;
- límites de vecinos;
- clústeres resumidos.

### Riesgo: inferencias incorrectas

Mitigaciones:

- nivel de confianza;
- evidencia enlazada;
- validación humana;
- capacidad de corregir;
- separar hechos e inferencias.

### Riesgo: soporte multilenguaje costoso

Mitigaciones:

- interfaz común de parsers;
- plugins;
- comenzar con un ecosistema;
- pruebas contractuales;
- comunidad open source.

### Riesgo: ahorro de tokens menor al esperado

Mitigaciones:

- medir baseline;
- registrar selección;
- comparar contra búsqueda tradicional;
- ajustar resúmenes;
- usar contexto por capas.

### Riesgo: seguridad de repositorios privados

Mitigaciones:

- modo local;
- secretos excluidos;
- cifrado;
- permisos mínimos;
- telemetría opt-in;
- auditoría.

### Riesgo: visualización atractiva pero poco útil

Mitigaciones:

- diseñar por tareas reales;
- no mostrar todo;
- ofrecer rutas guiadas;
- usar vistas especializadas;
- medir tiempo para resolver preguntas.

---

## 16. Decisiones iniciales recomendadas

1. Construir un **monorepo** para compartir contratos y acelerar el MVP.
2. Separar claramente motor de análisis, almacenamiento, API e interfaz.
3. Usar TypeScript como primer lenguaje de implementación por cercanía con el primer ecosistema soportado.
4. Diseñar parsers como plugins desde el inicio.
5. Usar un modelo de grafo abstracto independiente de la base de datos.
6. Iniciar con persistencia simple y permitir reemplazo posterior.
7. Priorizar datos confirmados antes de inferencias de IA.
8. No acoplar el núcleo a un proveedor de modelos.
9. Crear fixtures de repositorios desde la primera fase.
10. Versionar el esquema del grafo.
11. Mantener trazabilidad desde nodo hasta archivo y rango.
12. Implementar presupuesto de contexto como capacidad central, no como añadido.

---

## 17. Definición de “terminado” para el primer release útil

Codestellation 0.1 se considera útil cuando:

- instala y ejecuta localmente con documentación clara;
- importa un repositorio TypeScript real;
- indexa símbolos e imports;
- construye un grafo persistente;
- muestra una vista de alto nivel legible;
- permite buscar, expandir y seleccionar nodos;
- abre archivo y rango de código;
- muestra entradas y salidas de un nodo;
- genera contexto por tarea;
- exporta Markdown y JSON;
- actualiza el índice usando un diff;
- incluye pruebas del motor principal;
- no envía código a servicios externos sin consentimiento;
- registra limitaciones y confianza.

---

## 18. Manifiesto de producto

Codestellation debe evitar convertirse en una animación bonita sin profundidad. Cada elemento visual debe responder una pregunta útil.

La plataforma debe poder explicar:

- qué existe;
- cómo se conecta;
- por qué existe;
- dónde está;
- quién depende de ello;
- qué flujo representa;
- qué cambia si se modifica;
- qué necesita saber una IA para trabajar con seguridad.

### Frase guía

> Comprender antes de cambiar. Conectar antes de generar. Actualizar sin perder contexto.
