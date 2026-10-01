/**
 * main.js – Cargador modular + conexión Supabase
 * ------------------------------------------------
 * URL esperada:
 *   ?cct=28PJN9999X&a=12345
 *
 * Llama a la RPC: buscar_alumno(p_cct, p_numero_alumno)
 * y rellena la página con applyData().
 */

(function () {
  'use strict';

  /* ========== CONFIGURACIÓN SUPABASE ========== */
  var SUPABASE_URL = 'https://aghllznrmjmhjxzbzito.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_t59QVHo-9-nECQnUYu0tOg_2z_x108-';
  var RPC_NAME = 'buscar_alumno';

  /* ========== CONTENIDO EMBEBIDO (fallback file://) ========== */
  var FALLBACK = {
    header: '<header class="header" data-section="header">' +
      '<a href="#" class="logo-grupo" aria-label="Escuela" data-field="school-link">' +
      '<svg class="logo-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M32 4L8 14V30C8 44 18 54.5 32 60C46 54.5 56 44 56 30V14L32 4Z" fill="#023285"/>' +
      '<path d="M32 10L14 18V30C14 41 22 49.5 32 54C42 49.5 50 41 50 30V18L32 10Z" fill="#01409C"/>' +
      '<path d="M24 28H40V30H24V28ZM22 34H42V36H22V34ZM26 40H38V42H26V40Z" fill="white" opacity="0.9"/>' +
      '<path d="M32 18L33.5 22.5H38L34.5 25.5L36 30L32 27L28 30L29.5 25.5L26 22.5H30.5L32 18Z" fill="#C60925"/>' +
      '</svg>' +
      '<div class="logo-texto">' +
      '<span class="logo-nombre" data-field="school-name">—</span>' +
      '<span class="logo-lema" data-field="school-tagline">Formando el futuro</span>' +
      '</div></a></header>',

    persona: '<section class="seccion-persona" data-section="persona">' +
      '<div class="contenedor"><div class="persona-card">' +
      '<div class="persona-avatar" aria-hidden="true" data-field="person-initials">—</div>' +
      '<div class="persona-info">' +
      '<span class="persona-etiqueta" data-field="person-role">Estudiante</span>' +
      '<h2 class="persona-nombre" data-field="person-name">Cargando…</h2>' +
      '<p class="persona-rol" data-field="person-detail">—</p>' +
      '</div></div></div></section>',

    contacto: '<section class="seccion-contacto" data-section="contacto">' +
      '<div class="contacto-grid">' +
      '<div class="contacto-item" data-contact-type="email">' +
      '<div class="contacto-icono" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
      '</div><div class="contacto-texto">' +
      '<div class="contacto-label">Correo electrónico</div>' +
      '<div class="contacto-valor" data-field="contact-email">—</div>' +
      '</div></div>' +
      '<div class="contacto-item" data-contact-type="phone">' +
      '<div class="contacto-icono" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>' +
      '</div><div class="contacto-texto">' +
      '<div class="contacto-label">Teléfono</div>' +
      '<div class="contacto-valor" data-field="contact-phone">—</div>' +
      '</div></div></div></section>',

    cta: '<section class="seccion-cta" data-section="cta">' +
      '<h3 class="cta-titulo" data-field="cta-title">¿Deseas ponerte en contacto?</h3>' +
      '<p class="cta-texto" data-field="cta-text">Estoy disponible para resolver dudas o coordinar cualquier asunto relacionado con la formación.</p>' +
      '<a href="#" class="btn-contactar" data-field="cta-link" aria-label="Enviar correo">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
      'Contactar</a></section>',

    footer: '<footer class="footer" data-section="footer">' +
      '<strong data-field="footer-school">—</strong>' +
      '<span data-field="footer-text"> · Formando el futuro con excelencia académica y valores</span>' +
      '</footer>'
  };

  var SECTIONS = [
    { id: 'header',   path: 'sections/header.html' },
    { id: 'persona',  path: 'sections/persona.html' },
    { id: 'contacto', path: 'sections/contacto.html' },
    { id: 'cta',      path: 'sections/cta.html' },
    { id: 'footer',   path: 'sections/footer.html' }
  ];

  /* ========== UTILIDADES ========== */

  function getQueryParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      cct: (params.get('cct') || '').trim(),
      a:   (params.get('a') || '').trim()
    };
  }

  function iniciales(nombre) {
    if (!nombre) return '—';
    var partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

  function mostrarError(mensaje) {
    var app = document.getElementById('app');
    if (!app) return;
    var box = document.createElement('div');
    box.className = 'seccion-error';
    box.style.cssText = 'padding:48px 24px;text-align:center;max-width:480px;margin:40px auto;';
    box.innerHTML = '<p style="font-size:1.1rem;font-weight:600;color:#C60925;margin-bottom:8px;">No se pudo cargar la información</p>' +
      '<p style="color:#5A5A6E;">' + mensaje + '</p>';
    app.innerHTML = '';
    app.appendChild(box);
  }

  /* ========== CARGA DE SECCIONES ========== */

  async function loadSection(id, path, container) {
    if (window.location.protocol === 'file:') {
      container.innerHTML = FALLBACK[id] || '';
      return;
    }
    try {
      var response = await fetch(path);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      container.innerHTML = await response.text();
    } catch (err) {
      console.warn('Fetch falló para ' + path + ', usando fallback.', err);
      container.innerHTML = FALLBACK[id] || '<div class="seccion-error">No se pudo cargar esta sección.</div>';
    }
  }

  async function initSections() {
    var app = document.getElementById('app');
    if (!app) return;

    var slots = SECTIONS.map(function (s) {
      var el = document.createElement('div');
      el.id = 'slot-' + s.id;
      el.className = 'seccion-cargando';
      el.setAttribute('aria-busy', 'true');
      el.textContent = 'Cargando…';
      app.appendChild(el);
      return el;
    });

    await Promise.all(SECTIONS.map(function (s, i) {
      return loadSection(s.id, s.path, slots[i]);
    }));

    slots.forEach(function (slot) {
      slot.classList.remove('seccion-cargando');
      slot.removeAttribute('aria-busy');
      while (slot.firstChild) app.insertBefore(slot.firstChild, slot);
      slot.remove();
    });

    document.dispatchEvent(new CustomEvent('sections:loaded'));
  }

  /* ========== SUPABASE RPC ========== */

  async function fetchAlumno(cct, numeroAlumno) {
    var url = SUPABASE_URL + '/rest/v1/rpc/' + RPC_NAME;
    var response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify({
        p_cct: cct,
        p_numero_alumno: numeroAlumno
      })
    });

    if (!response.ok) {
      var errText = await response.text().catch(function () { return ''; });
      console.error('Supabase error:', response.status, errText);
      throw new Error('Error al consultar la base de datos (' + response.status + ')');
    }

    var data = await response.json();

    // La RPC puede devolver un objeto o un array con una fila
    if (Array.isArray(data)) {
      if (data.length === 0) return null;
      return data[0];
    }
    return data;
  }

  /**
   * Mapea la respuesta de buscar_alumno a los data-field de la página
   */
  function mapAlumnoToFields(row) {
    var nombre = row.nombre_completo || '—';
    var detalle = [row.grado, row.grupo, row.turno].filter(Boolean).join(' · ') || '—';
    var email = row.correo || '';
    var mailto = email
      ? 'mailto:' + email + '?subject=' + encodeURIComponent('Contacto institucional - ' + nombre)
      : '#';

    return {
      'school-name':     row.escuela || '—',
      'footer-school':   row.escuela || '—',
      'person-name':     nombre,
      'person-detail':   detalle,
      'person-initials': iniciales(nombre),
      'person-role':     'Estudiante',
      'contact-email':   email || '—',
      'contact-phone':   row.telefono || '—',
      'cta-link':        mailto,
      'cta-title':       '¿Deseas ponerte en contacto?',
      'cta-text':        row.tutor
        ? 'Contacto a través de ' + row.tutor + '.'
        : 'Estoy disponible para resolver dudas o coordinar cualquier asunto relacionado con la formación.'
    };
  }

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

  /* ========== INICIO ========== */

  async function start() {
    await initSections();

    var params = getQueryParams();

    if (!params.cct || !params.a) {
      mostrarError('Faltan parámetros en la URL. Usa: ?cct=TU_CCT&a=NUMERO_ALUMNO');
      return;
    }

    try {
      var alumno = await fetchAlumno(params.cct, params.a);
      if (!alumno) {
        mostrarError('No se encontró al alumno con CCT «' + params.cct + '» y número «' + params.a + '».');
        return;
      }
      applyData(mapAlumnoToFields(alumno));
      if (alumno.nombre_completo) {
        document.title = alumno.nombre_completo + ' · ' + (alumno.escuela || '');
      }
    } catch (err) {
      console.error(err);
      mostrarError(err.message || 'Error inesperado al cargar los datos.');
    }
  }

  window.PresentacionApp = {
    applyData: applyData,
    reloadSections: initSections,
    fetchAlumno: fetchAlumno
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
