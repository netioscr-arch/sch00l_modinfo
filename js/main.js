/**
 * main.js – Cargador modular + conexión Supabase
 * ------------------------------------------------
 * URL: ?cct=28PJN9999X&a=CE-0015
 * RPC: buscar_alumno(p_cct, p_numero_alumno)
 */

(function () {
  'use strict';

  /* ========== CONFIGURACIÓN SUPABASE ========== */
  var SUPABASE_URL = 'https://aghllznrmjmhjxzbzito.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_t59QVHo-9-nECQnUYu0tOg_2z_x108-';
  var RPC_NAME = 'buscar_alumno';

  /* Título genérico del tab (solo institución al cargar datos) */
  var TITULO_DEFAULT = 'Presentación institucional';

  /* ========== HTML de carga / error (sin datos de ejemplo) ========== */
  var HTML_CARGANDO =
    '<div class="estado-pantalla" id="estado-carga">' +
    '  <div class="estado-spinner" aria-hidden="true"></div>' +
    '  <p class="estado-texto">Cargando información…</p>' +
    '</div>';

  var SECTIONS = [
    { id: 'header',   path: 'sections/header.html' },
    { id: 'persona',  path: 'sections/persona.html' },
    { id: 'contacto', path: 'sections/contacto.html' },
    { id: 'cta',      path: 'sections/cta.html' },
    { id: 'footer',   path: 'sections/footer.html' }
  ];

  /* Fallback sin nombres de ejemplo (por si falla fetch de secciones) */
  var FALLBACK = {
    header:
      '<header class="header" data-section="header">' +
      '<a href="#" class="logo-grupo" aria-label="Escuela" data-field="school-link">' +
      '<div class="logo-mark">' +
      '<img class="logo-img" data-field="school-logo" alt="Logo de la escuela" width="52" height="52" hidden>' +
      '<svg class="logo-svg logo-svg-fallback" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M32 4L8 14V30C8 44 18 54.5 32 60C46 54.5 56 44 56 30V14L32 4Z" fill="#023285"/>' +
      '<path d="M32 10L14 18V30C14 41 22 49.5 32 54C42 49.5 50 41 50 30V18L32 10Z" fill="#01409C"/>' +
      '<path d="M24 28H40V30H24V28ZM22 34H42V36H22V34ZM26 40H38V42H26V40Z" fill="white" opacity="0.9"/>' +
      '<path d="M32 18L33.5 22.5H38L34.5 25.5L36 30L32 27L28 30L29.5 25.5L26 22.5H30.5L32 18Z" fill="#C60925"/>' +
      '</svg></div>' +
      '<div class="logo-texto">' +
      '<span class="logo-nombre" data-field="school-name">&nbsp;</span>' +
      '<span class="logo-lema" data-field="school-tagline">Formando el futuro</span>' +
      '</div></a></header>',
    persona:
      '<section class="seccion-persona" data-section="persona">' +
      '<div class="contenedor"><div class="persona-card">' +
      '<div class="persona-avatar" aria-hidden="true" data-field="person-initials">&nbsp;</div>' +
      '<div class="persona-info">' +
      '<span class="persona-etiqueta" data-field="person-role">Estudiante</span>' +
      '<h2 class="persona-nombre" data-field="person-name">&nbsp;</h2>' +
      '<p class="persona-rol" data-field="person-detail">&nbsp;</p>' +
      '</div></div></div></section>',
    contacto:
      '<section class="seccion-contacto" data-section="contacto">' +
      '<div class="contacto-grid">' +
      '<div class="contacto-item"><div class="contacto-icono" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
      '</div><div class="contacto-texto"><div class="contacto-label">Correo electrónico</div>' +
      '<div class="contacto-valor" data-field="contact-email">&nbsp;</div></div></div>' +
      '<div class="contacto-item"><div class="contacto-icono" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>' +
      '</div><div class="contacto-texto"><div class="contacto-label">Teléfono</div>' +
      '<div class="contacto-valor" data-field="contact-phone">&nbsp;</div></div></div></div></section>',
    cta:
      '<section class="seccion-cta" data-section="cta">' +
      '<h3 class="cta-titulo" data-field="cta-title">¿Deseas ponerte en contacto?</h3>' +
      '<p class="cta-texto" data-field="cta-text">&nbsp;</p>' +
      '<a href="#" class="btn-contactar" data-field="cta-link" aria-label="Enviar correo">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
      'Contactar</a></section>',
    footer:
      '<footer class="footer" data-section="footer">' +
      '<strong data-field="footer-school">&nbsp;</strong>' +
      '<span data-field="footer-text"> · Formando el futuro con excelencia académica y valores</span></footer>'
  };

  function getQueryParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      cct: (params.get('cct') || '').trim(),
      a: (params.get('a') || '').trim()
    };
  }

  function iniciales(nombre) {
    if (!nombre || !String(nombre).trim()) return '';
    var partes = String(nombre).trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

  /** Pantalla de estado (carga / sin datos / no encontrado) — sin términos técnicos */
  function mostrarEstado(tipo, mensaje) {
    var app = document.getElementById('app');
    if (!app) return;

    document.title = TITULO_DEFAULT;

    var icono = '';
    if (tipo === 'vacio') {
      icono = '<div class="estado-icono" aria-hidden="true">🔗</div>';
    } else if (tipo === 'noencontrado') {
      icono = '<div class="estado-icono" aria-hidden="true">🔍</div>';
    } else if (tipo === 'error') {
      icono = '<div class="estado-icono" aria-hidden="true">⚠️</div>';
    }

    app.innerHTML =
      '<div class="estado-pantalla">' +
      icono +
      '<p class="estado-titulo">' + (mensaje.titulo || '') + '</p>' +
      '<p class="estado-texto">' + (mensaje.texto || '') + '</p>' +
      '</div>';
  }

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
      console.warn('Fetch falló para ' + path, err);
      container.innerHTML = FALLBACK[id] || '';
    }
  }

  async function initSections() {
    var app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = '';
    var slots = SECTIONS.map(function (s) {
      var el = document.createElement('div');
      el.id = 'slot-' + s.id;
      el.setAttribute('aria-hidden', 'true');
      el.style.display = 'none';
      app.appendChild(el);
      return el;
    });

    await Promise.all(SECTIONS.map(function (s, i) {
      return loadSection(s.id, s.path, slots[i]);
    }));

    slots.forEach(function (slot) {
      while (slot.firstChild) app.insertBefore(slot.firstChild, slot);
      slot.remove();
    });

    // Ocultar contenido hasta tener datos reales
    app.style.visibility = 'hidden';
  }

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
      throw new Error('No fue posible consultar la información en este momento.');
    }

    var data = await response.json();
    if (Array.isArray(data)) {
      if (data.length === 0) return null;
      return data[0];
    }
    // Objeto vacío o sin nombre = no encontrado
    if (!data || (typeof data === 'object' && !data.nombre_completo && !data.escuela)) {
      return null;
    }
    return data;
  }

  function mapAlumnoToFields(row) {
    var nombre = row.nombre_completo || '';
    var detalle = [row.grado, row.grupo, row.turno].filter(Boolean).join(' · ') || '';
    var email = row.correo || '';
    var mailto = email
      ? 'mailto:' + email + '?subject=' + encodeURIComponent('Contacto institucional - ' + nombre)
      : '#';

    var slogan = row.eslogan || row.slogan || row.lema || '';
    var logoUrl = (row.logo || '').trim();

    return {
      'school-name': row.escuela || '',
      'school-tagline': slogan || 'Formando el futuro',
      'school-logo': logoUrl,
      'footer-school': row.escuela || '',
      'person-name': nombre,
      'person-detail': detalle,
      'person-initials': iniciales(nombre),
      'person-role': 'Estudiante',
      'contact-email': email || '—',
      'contact-phone': row.telefono || '—',
      'cta-link': mailto,
      'cta-title': '¿Deseas ponerte en contacto?',
      'cta-text': row.tutor
        ? 'Contacto a través de ' + row.tutor + '.'
        : 'Disponible para resolver dudas relacionadas con la formación.'
    };
  }

  function updateLogoMarks() {
    document.querySelectorAll('.logo-mark').forEach(function (mark) {
      var img = mark.querySelector('.logo-img');
      if (img && img.getAttribute('src')) {
        img.hidden = false;
        mark.classList.add('has-logo');
      } else {
        if (img) img.hidden = true;
        mark.classList.remove('has-logo');
      }
    });
  }

  function applyData(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (field) {
      var value = data[field];
      var elements = document.querySelectorAll('[data-field="' + field + '"]');
      elements.forEach(function (el) {
        if (el.tagName === 'A' && field.indexOf('link') !== -1) {
          el.setAttribute('href', value || '#');
        } else if (el.tagName === 'IMG') {
          if (value) {
            el.setAttribute('src', value);
            el.removeAttribute('hidden');
          } else {
            el.removeAttribute('src');
            el.setAttribute('hidden', '');
          }
        } else {
          el.textContent = value;
        }
      });
    });
    updateLogoMarks();
  }

  async function start() {
    document.title = TITULO_DEFAULT;

    var app = document.getElementById('app');
    if (app) app.innerHTML = HTML_CARGANDO;

    var params = getQueryParams();

    /* Sin parámetros: mensaje amable, sin instrucciones técnicas */
    if (!params.cct || !params.a) {
      mostrarEstado('vacio', {
        titulo: 'Enlace incompleto',
        texto: 'Esta página necesita un enlace válido para mostrar la información. Solicita el enlace correcto a la institución.'
      });
      return;
    }

    try {
      await initSections();
      var alumno = await fetchAlumno(params.cct, params.a);

      if (!alumno) {
        mostrarEstado('noencontrado', {
          titulo: 'No se encontró la información',
          texto: 'No hay registros que coincidan con los datos del enlace. Verifica el enlace o contacta a la institución.'
        });
        return;
      }

      applyData(mapAlumnoToFields(alumno));

      /* Título del tab: SOLO nombre de la institución */
      document.title = (alumno.escuela && String(alumno.escuela).trim())
        ? String(alumno.escuela).trim()
        : TITULO_DEFAULT;

      if (app) app.style.visibility = 'visible';
    } catch (err) {
      console.error(err);
      mostrarEstado('error', {
        titulo: 'No se pudo cargar',
        texto: err.message || 'Ocurrió un problema al obtener la información. Intenta de nuevo más tarde.'
      });
    }
  }

  window.PresentacionApp = {
    applyData: applyData,
    fetchAlumno: fetchAlumno
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
