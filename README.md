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

## Documentación del producto

La visión, el alcance funcional, la propuesta de valor, los casos de uso, el MVP y los criterios del primer release útil están definidos en:

- [`docs/00_CODESTELLATION_MASTER_PLAN.md`](./docs/00_CODESTELLATION_MASTER_PLAN.md)

## Estado

Este repositorio se encuentra en la **Fase 0 — Descubrimiento y definición**. El siguiente paso es documentar los límites del sistema, sus componentes y los flujos principales de indexación y generación de contexto.

> Comprender antes de cambiar. Conectar antes de generar. Actualizar sin perder contexto.
