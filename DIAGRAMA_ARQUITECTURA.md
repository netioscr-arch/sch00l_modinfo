# Diagrama de Funcionamiento – Página de Presentación Institucional

Documento de referencia para entender la arquitectura actual, el flujo del usuario y las opciones de evolución hacia una base de datos.

---

## 1. Arquitectura general (estado actual)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR DEL USUARIO                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     index.html (#app)                         │  │
│  │                                                               │  │
│  │   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────┐  ┌──────┐ │  │
│  │   │ header  │  │ persona  │  │ contacto │  │ cta │  │footer│ │  │
│  │   │  .html  │  │  .html   │  │  .html   │  │.html│  │ .html│ │  │
│  │   └────┬────┘  └────┬─────┘  └────┬─────┘  └──┬──┘  └───┬──┘ │  │
│  │        │            │             │           │         │    │  │
│  │        └────────────┴─────────────┴───────────┴─────────┘    │  │
│  │                              │                                │  │
│  │                    css/styles.css  (estilos globales)         │  │
│  │                    js/main.js      (cargador + applyData)     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                         HTTP GET (fetch)
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                     SERVIDOR WEB ESTÁTICO                           │
│         (Netlify / GitHub Pages / Apache / Nginx / Vercel)          │
│                                                                     │
│   /index.html                                                       │
│   /css/styles.css                                                   │
│   /js/main.js                                                       │
│   /sections/*.html                                                  │
│   /assets/  (futuro)                                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Características actuales:**
- Solo frontend (HTML + CSS + JS vanilla)
- Sin backend ni base de datos
- Datos hardcodeados dentro de cada sección HTML
- Carga modular mediante `fetch` desde `js/main.js`

---

## 2. Flujo de carga de la página (proceso dinámico)

```
 Usuario abre la URL
         │
         ▼
 ┌───────────────────┐
 │  Servidor entrega │
 │   index.html      │
 └─────────┬─────────┘
           │
           ▼
 ┌───────────────────┐
 │  Navegador parsea │
 │  HTML + carga CSS │
 └─────────┬─────────┘
           │
           ▼
 ┌───────────────────┐
 │  Se ejecuta       │
 │  js/main.js       │
 └─────────┬─────────┘
           │
           ▼
 ┌─────────────────────────────────────────┐
 │  Promise.all → fetch paralelo de:       │
 │  • sections/header.html                 │
 │  • sections/persona.html                │
 │  • sections/contacto.html               │
 │  • sections/cta.html                    │
 │  • sections/footer.html                 │
 └─────────┬───────────────────────────────┘
           │
           ▼
 ┌───────────────────┐
 │  Se insertan en   │
 │  #app (DOM)       │
 └─────────┬─────────┘
           │
           ▼
 ┌───────────────────┐
 │  Evento           │
 │  sections:loaded  │
 │  (listo para      │
 │   applyData)      │
 └───────────────────┘
```

---

## 3. Flujo de usuario (navegación típica)

```
┌──────────────┐
│  Usuario     │
│  llega a la  │
│  página      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│  1. HEADER (sticky)          │
│  Ve logo + nombre escuela    │
│  (elemento de confianza)     │
└──────────────┬───────────────┘
               │  scroll / vista
               ▼
┌──────────────────────────────┐
│  2. SECCIÓN PERSONA          │
│  Avatar + nombre + grado     │
│  (humaniza la institución)   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  3. DATOS DE CONTACTO        │
│  Email y teléfono visibles   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  4. CTA – Botón Contactar    │
│  Usuario hace clic           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  5. Cliente de correo        │
│  (mailto:) se abre con       │
│  destinatario y asunto       │
│  precargados                 │
└──────────────────────────────┘
```

**Interacciones principales actuales:**

| Acción del usuario              | Qué ocurre                                      |
|---------------------------------|--------------------------------------------------|
| Carga la página                 | `main.js` trae las 5 secciones vía fetch        |
| Hace scroll                     | Header sticky permanece visible                 |
| Clic en “Contactar”             | Se abre el cliente de correo (`mailto:`)        |
| Redimensiona ventana / móvil    | CSS responsive reacomoda el layout              |

---

## 4. Componentes técnicos y conexiones

```
                    ┌─────────────────────┐
                    │   Usuario final     │
                    └──────────┬──────────┘
                               │ HTTPS
                    ┌──────────▼──────────┐
                    │  CDN / Hosting      │
                    │  estático           │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │ index.html  │     │ styles.css  │     │  main.js    │
   └──────┬──────┘     └─────────────┘     └──────┬──────┘
          │                                        │
          │              fetch()                   │
          │         ┌──────────────────────────────┘
          │         │
          ▼         ▼
   ┌────────────────────────────┐
   │     /sections/*.html       │
   │  (fragmentos modulares)    │
   └────────────────────────────┘
```

No hay backend, API ni base de datos en la versión actual.

---

## 5. Variantes para conectar a una base de datos

Cuando quieras que los datos (nombre, email, grado, etc.) vengan de una BD en lugar de estar hardcodeados, tienes estas opciones:

### Opción A – API REST + Frontend actual (recomendada)

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  Navegador │────▶│  main.js   │────▶│  API REST  │────▶│ Base de    │
│            │◀────│ applyData()│◀────│ (Node/PHP/ │◀────│ datos      │
└────────────┘     └────────────┘     │  Python)   │     │ (MySQL/    │
                                      └────────────┘     │  Postgres/ │
                                                         │  SQLite)   │
                                                         └────────────┘
```

**Flujo:**
1. La página carga igual (secciones HTML).
2. Tras `sections:loaded`, `main.js` hace `fetch('/api/persona/123')`.
3. La API consulta la BD y devuelve JSON.
4. Se llama `PresentacionApp.applyData(json)` y se actualizan los `data-field`.

**Ventajas:** Mínimo cambio en el frontend actual. Escalable.  
**Cuándo usarla:** Cuando ya tengas o planees un backend (Node, Laravel, Django, etc.).

---

### Opción B – Backend que renderiza las secciones (SSR / plantillas)

```
┌────────────┐     ┌────────────────────┐     ┌────────────┐
│  Navegador │────▶│  Servidor (PHP/    │────▶│ Base de    │
│            │◀────│  Node/Python)      │◀────│ datos      │
└────────────┘     │  genera HTML       │     └────────────┘
                   │  con datos de BD   │
                   └────────────────────┘
```

**Flujo:** El servidor consulta la BD y genera el HTML ya relleno antes de enviarlo.

**Ventajas:** Mejor SEO, sin dependencia de JS para el contenido.  
**Cuándo usarla:** Si necesitas indexación fuerte o usuarios sin JS.

---

### Opción C – Headless CMS / Backend-as-a-Service

```
┌────────────┐     ┌────────────┐     ┌──────────────────┐
│  Navegador │────▶│  main.js   │────▶│  Supabase /      │
│            │◀────│ applyData()│◀────│  Firebase /      │
└────────────┘     └────────────┘     │  Strapi / Directus│
                                      └─────────┬────────┘
                                                │
                                      ┌─────────▼────────┐
                                      │  Base de datos   │
                                      │  gestionada      │
                                      └──────────────────┘
```

**Ventajas:** Muy rápido de implementar, panel de admin incluido, autenticación lista.  
**Cuándo usarla:** Proyectos pequeños/medianos, prototipos, o si no quieres mantener servidor propio.

---

### Opción D – Archivo JSON estático (paso intermedio)

```
┌────────────┐     ┌────────────┐     ┌────────────────┐
│  Navegador │────▶│  main.js   │────▶│  /data/        │
│            │◀────│ applyData()│◀────│  persona.json  │
└────────────┘     └────────────┘     └────────────────┘
```

**Ventajas:** Cero backend. Solo subes un JSON. Ideal como puente antes de una BD real.  
**Cuándo usarla:** Mientras no tengas backend, pero ya quieras separar datos del HTML.

---

## 6. Recomendación

| Situación                                      | Opción recomendada      |
|------------------------------------------------|-------------------------|
| Quieres mantener el frontend actual y crecer   | **A – API REST**        |
| Necesitas algo ya, sin programar backend       | **C – Supabase/Firebase** o **D – JSON** |
| Prioridad SEO / sin depender de JavaScript     | **B – SSR**             |
| Solo unas pocas personas y datos poco variables| **D – JSON estático**   |

**Ruta sugerida de evolución:**

1. **Ahora:** Mantener la estructura modular actual.
2. **Corto plazo:** Pasar los datos a un `data/persona.json` y usar `applyData()` (Opción D).
3. **Mediano plazo:** Sustituir el JSON por una API real (Opción A o C) sin tocar casi el HTML.

La función `applyData()` y los atributos `data-field` ya están preparados exactamente para este camino.

---

## 7. Resumen visual de capas

```
┌──────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN (lo que ve el usuario)             │
│  header · persona · contacto · cta · footer              │
├──────────────────────────────────────────────────────────┤
│  CAPA DE LÓGICA FRONTEND                                 │
│  main.js (carga de secciones + applyData)                │
├──────────────────────────────────────────────────────────┤
│  CAPA DE ESTILOS                                         │
│  styles.css (variables, responsive, componentes)         │
├──────────────────────────────────────────────────────────┤
│  CAPA DE DATOS (hoy: hardcode / mañana: API o BD)        │
│  sections/*.html  →  futuro: JSON / REST / CMS           │
├──────────────────────────────────────────────────────────┤
│  CAPA DE INFRAESTRUCTURA                                 │
│  Hosting estático (hoy)  →  + Backend/API (mañana)       │
└──────────────────────────────────────────────────────────┘
```

---

*Documento generado para el proyecto de presentación institucional modular.*  
*Última actualización: compatible con la estructura de carpetas actual (`presentacion/`).*
