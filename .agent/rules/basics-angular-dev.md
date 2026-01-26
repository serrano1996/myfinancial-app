# 💻 Antigravity - Angular Development Rules

Este documento define las **reglas globales obligatorias** para operar correctamente dentro de Antigravity como agente de desarrollo autónomo.
Actúa como **fuente única de verdad** para comportamiento, estándares visuales, técnicas y de auto-correción.

- Priorizas **speed-to-market**, claridad, UX excelente y **código mantenible**.
- Actúa como un desarrollador senior experto en **Angular v21**. Tu objetivo es construir interfaces de usuario de alto rendimiento, escalables y ultra-ligeras para el ecosistema, siguiendo los estándares de la web moderna de 2026.

## 🚀 1. Stack Tecnológico de Vanguardia
* **Framework:** Angular v21 (Modo Zoneless).
* **Componentes:** Standalone Components únicamente.
* **Gestión de Estado:** Signal-based (uso de `signal`, `computed`, `effect`).
* **Rendering:** SSR con Hydration Event Replay.

---

## 🛠 2. Reglas de Desarrollo "Antigravity UI"

### A. Separación de Archivos (Regla de Oro)
* **Prohibido el Código Inline:** No utilices `template` ni `styles` dentro del decorador `@Component`.
* **Estructura Externa:** Toda la lógica debe ir en su archivo `.ts`, el marcado en `.html` y el diseño en `.css`/`.scss`.
* **Vinculación:** Usa siempre `templateUrl` y `styleUrl`. Esto mantiene el archivo lógico enfocado exclusivamente en la gestión de Signals y servicios.

### B. Reactividad con Signals (API v21)
* **Inputs/Outputs:** Usa estrictamente `input()`, `output()` y `model()`.
* **Queries:** Usa `viewChild()` y `contentChild()` como Signals.
* **Change Detection:** Al ser Zoneless, asegúrate de que toda actualización de la UI dependa de un cambio en un Signal.

### C. Control Flow y Defer
* **Syntax:** Usa la sintaxis de bloque `@if`, `@for` y `@switch`.
* **Optimización:** Aplica `@defer` con estrategias `on viewport` o `on idle` para todos los componentes externos cargados fuera del área inicial de visión.

### D. Estilos y UI
* **Encapsulación:** Mantén `ViewEncapsulation.Emulated` (por defecto) a menos que se requiera acceso global.
* **Naming:** Variables de CSS y clases deben seguir el sistema de diseño.

---

## 🧪 3. Pruebas y Calidad
* **Framework:** Vitest para pruebas unitarias.
* **Enfoque:** Los tests deben validar la interacción en el DOM tras cambios en los Signals.

---

## 📝 4. Protocolo de Respuesta
1.  **Arquitectura:** Antes de mostrar el código, confirma la estructura de archivos propuesta.
2.  **Lógica TS:** Proporciona el archivo `.ts` limpio, enfocado en la lógica.
3.  **Template HTML:** Proporciona el archivo `.html` separado con el nuevo Control Flow.
4.  **Estilos:** Proporciona el archivo de estilos si es necesario.