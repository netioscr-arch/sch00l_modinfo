/**
 * main.js – Cargador modular de secciones
 * ----------------------------------------
 * - Intenta cargar cada sección vía fetch (servidor web)
 * - Si falla (p. ej. abrir con doble clic / file://), usa contenido embebido
 * - Preparado para inyección de datos desde API / base de datos
 *
 * USO FUTURO CON BD/API:
 * 1. Fetch de datos: const data = await fetch('/api/persona/123').then(r => r.json())
 * 2. Llamar applyData(data) después de cargar las secciones
 * 3. Los atributos data-field se actualizan automáticamente
 */

(function () {
  'use strict';

  /** Contenido embebido de respaldo (funciona sin servidor) */
  const FALLBACK = {
    header: `<!--
  SECCIÓN: Header institucional
-->
<header class="header" data-section="header">
  <a href="#" class="logo-grupo" aria-label="Colegio Excelencia" data-field="school-link">
    <svg class="logo-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 4L8 14V30C8 44 18 54.5 32 60C46 54.5 56 44 56 30V14L32 4Z" fill="#023285"/>
      <path d="M32 10L14 18V30C14 41 22 49.5 32 54C42 49.5 50 41 50 30V18L32 10Z" fill="#01409C"/>
      <path d="M24 28H40V30H24V28ZM22 34H42V36H22V34ZM26 40H38V42H26V40Z" fill="white" opacity="0.9"/>
      <path d="M32 18L33.5 22.5H38L34.5 25.5L36 30L32 27L28 30L29.5 25.5L26 22.5H30.5L32 18Z" fill="#C60925"/>
    </svg>
    <div class="logo-texto">
      <span class="logo-nombre" data-field="school-name">Colegio Excelencia</span>
      <span class="logo-lema" data-field="school-tagline">Formando el futuro</span>
    </div>
  </a>
</header>`,

    persona: `<!--
  SECCIÓN: Persona
-->
<section class="seccion-persona" data-section="persona">
  <div class="contenedor">
    <div class="persona-card">
      <div class="persona-avatar" aria-hidden="true" data-field="person-initials">AG</div>
      <div class="persona-info">
        <span class="persona-etiqueta" data-field="person-role">Estudiante</span>
        <h2 class="persona-nombre" data-field="person-name">Ana García López</h2>
        <p class="persona-rol" data-field="person-detail">5°B · Bachillerato General · Turno Matutino</p>
      </div>
    </div>
  </div>
</section>`,

    contacto: `<!--
  SECCIÓN: Datos de contacto
-->
<section class="seccion-contacto" data-section="contacto">
  <div class="contacto-grid">
    <div class="contacto-item" data-contact-type="email">
      <div class="contacto-icono" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
      </div>
      <div class="contacto-texto">
        <div class="contacto-label">Correo electrónico</div>
        <div class="contacto-valor" data-field="contact-email">ana.garcia@colegio.edu.mx</div>
      </div>
    </div>
    <div class="contacto-item" data-contact-type="phone">
      <div class="contacto-icono" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      </div>
      <div class="contacto-texto">
        <div class="contacto-label">Teléfono</div>
        <div class="contacto-valor" data-field="contact-phone">+52 55 9876 5432</div>
      </div>
    </div>
  </div>
</section>`,

    cta: `<!--
  SECCIÓN: CTA
-->
<section class="seccion-cta" data-section="cta">
  <h3 class="cta-titulo" data-field="cta-title">¿Deseas ponerte en contacto?</h3>
  <p class="cta-texto" data-field="cta-text">
    Estoy disponible para resolver dudas o coordinar cualquier asunto relacionado con mi formación.
  </p>
  <a href="mailto:ana.garcia@colegio.edu.mx?subject=Contacto%20institucional%20-%20Ana%20Garc%C3%ADa%20L%C3%B3pez"
     class="btn-contactar"
     data-field="cta-link"
     aria-label="Enviar correo a Ana García López">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
    Contactar
  </a>
</section>`,

    footer: `<!--
  SECCIÓN: Footer
-->
<footer class="footer" data-section="footer">
  <strong data-field="footer-school">Colegio Excelencia</strong>
  <span data-field="footer-text"> · Formando el futuro con excelencia académica y valores</span>
</footer>`
  };

  /** Rutas de las secciones (orden de carga = orden visual) */
  const SECTIONS = [
    { id: 'header',   path: 'sections/header.html' },
    { id: 'persona',  path: 'sections/persona.html' },
    { id: 'contacto', path: 'sections/contacto.html' },
    { id: 'cta',      path: 'sections/cta.html' },
    { id: 'footer',   path: 'sections/footer.html' }
  ];

  /**
   * Carga un fragmento HTML. Si fetch falla, usa el fallback embebido.
   */
  async function loadSection(id, path, container) {
    // Si se abre como archivo local, usar fallback directamente
    if (window.location.protocol === 'file:') {
      container.innerHTML = FALLBACK[id] || '';
      return;
    }

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const html = await response.text();
      container.innerHTML = html;
    } catch (err) {
      console.warn('Fetch falló para ' + path + ', usando contenido embebido.', err);
      container.innerHTML = FALLBACK[id] || '<div class="seccion-error">No se pudo cargar esta sección.</div>';
    }
  }

  /**
   * Carga todas las secciones y las coloca en #app.
   */
  async function initSections() {
    const app = document.getElementById('app');
    if (!app) return;

    const slots = SECTIONS.map(function (s) {
      const el = document.createElement('div');
      el.id = 'slot-' + s.id;
      el.className = 'seccion-cargando';
      el.setAttribute('aria-busy', 'true');
      el.textContent = 'Cargando…';
      app.appendChild(el);
      return el;
    });

    await Promise.all(
      SECTIONS.map(function (s, i) {
        return loadSection(s.id, s.path, slots[i]);
      })
    );

    slots.forEach(function (slot) {
      slot.classList.remove('seccion-cargando');
      slot.removeAttribute('aria-busy');
      while (slot.firstChild) {
        app.insertBefore(slot.firstChild, slot);
      }
      slot.remove();
    });

    document.dispatchEvent(new CustomEvent('sections:loaded'));
  }

  /**
   * Aplica datos dinámicos a los elementos con data-field.
   * Ideal para conectar a una API o base de datos.
   */
  function applyData(data) {
    if (!data || typeof data !== 'object') return;

    Object.keys(data).forEach(function (field) {
      var value = data[field];
      var elements = document.querySelectorAll('[data-field="' + field + '"]');
      elements.forEach(function (el) {
        if (el.tagName === 'A' && field.indexOf('link') !== -1) {
          el.setAttribute('href', value);
        } else if (el.tagName === 'IMG') {
          el.setAttribute('src', value);
        } else {
          el.textContent = value;
        }
      });
    });
  }

  window.PresentacionApp = {
    applyData: applyData,
    reloadSections: initSections
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSections);
  } else {
    initSections();
  }
})();
