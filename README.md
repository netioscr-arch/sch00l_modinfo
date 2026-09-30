# Presentación Institucional – Estructura Multiarchivo

Proyecto modular en HTML/CSS/JavaScript vanilla. Sin dependencias externas.

## Estructura de carpetas

```
presentacion/
├── index.html              ← Página principal (punto de entrada)
├── css/
│   └── styles.css          ← Estilos globales + variables CSS + media queries
├── js/
│   └── main.js             ← Cargador de secciones + applyData() para BD/API
├── sections/
│   ├── header.html         ← Logo + nombre de la institución
│   ├── persona.html        ← Avatar + nombre + grado del estudiante
│   ├── contacto.html       ← Email y teléfono
│   ├── cta.html            ← Llamado a la acción (botón Contactar)
│   └── footer.html         ← Pie de página institucional
├── components/             ← Reservado para componentes reutilizables futuros
├── assets/                 ← Imágenes, iconos, etc.
└── README.md
```

## Cómo funciona

1. `index.html` define el contenedor `#app`.
2. `js/main.js` carga en paralelo cada archivo de `/sections/` mediante `fetch`.
3. Los fragmentos HTML se insertan en el orden definido.
4. Los estilos de `css/styles.css` se aplican globalmente.

> **Importante:** Debe servirse desde un servidor web (local o remoto).  
> Abrir el archivo con `file://` no permite `fetch` por políticas de seguridad del navegador.

### Servidor local rápido

```bash
# Python
python -m http.server 8080

# Node (si tienes npx)
npx serve .
```

Luego abre `http://localhost:8080`.

## Preparado para base de datos / API

Cada sección usa atributos `data-field` y `data-section` para identificar los puntos de datos.

### Ejemplo de inyección de datos

```js
// Después de que las secciones carguen (evento sections:loaded)
document.addEventListener('sections:loaded', () => {
  // Simulación de respuesta de API
  const datos = {
    'person-name': 'Ana García López',
    'person-role': 'Estudiante',
    'person-detail': '5°B · Bachillerato General · Turno Matutino',
    'person-initials': 'AG',
    'contact-email': 'ana.garcia@colegio.edu.mx',
    'contact-phone': '+52 55 9876 5432',
    'cta-title': '¿Deseas ponerte en contacto?',
    'cta-text': 'Estoy disponible para resolver dudas...',
    'cta-link': 'mailto:ana.garcia@colegio.edu.mx?subject=Contacto',
    'school-name': 'Colegio Excelencia',
    'school-tagline': 'Formando el futuro',
    'footer-school': 'Colegio Excelencia',
    'footer-text': ' · Formando el futuro con excelencia académica y valores'
  };

  window.PresentacionApp.applyData(datos);
});
```

En producción solo cambia la fuente de `datos` por un `fetch('/api/persona/ID')`.

## Personalización

| Qué cambiar              | Dónde                                      |
|--------------------------|--------------------------------------------|
| Colores                  | `css/styles.css` → bloque `:root`          |
| Textos de una sección    | Archivo correspondiente en `sections/`     |
| Orden de secciones       | Array `SECTIONS` en `js/main.js`           |
| Añadir nueva sección     | Crear HTML en `sections/` + registrar en `SECTIONS` |

## Requisitos

- Navegador moderno con soporte de `fetch` y CSS custom properties
- Servidor HTTP (cualquier hosting estático funciona: Netlify, GitHub Pages, Vercel, Apache, Nginx, etc.)
