/* Código común de los formularios de captura y modificación.
   Lo cargan las 4 páginas (captura-alumno, captura-escuela,
   modificar-alumno y modificar-escuela) antes de su propio archivo .js,
   así la conexión a Supabase y la carga de los desplegables no se
   repiten en cada página. */
var Sch00lForms = (function () {
  'use strict';

  var SUPABASE_URL = 'https://aghllznrmjmhjxzbzito.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_t59QVHo-9-nECQnUYu0tOg_2z_x108-';
  var PRESENTACION_URL = 'https://sch00l-modinfo.vercel.app/';

  var escuelasPorId = {};
  var cicloActualId = null;

  function rpc(nombre, body) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify(body || {})
    }).then(function (resp) {
      return resp.json().then(function (data) {
        if (!resp.ok) throw new Error((data && data.message) || 'No se pudo conectar.');
        return data;
      });
    });
  }

  function valor(id) {
    var el = document.getElementById(id);
    var v = el ? el.value : '';
    return v ? v.trim() : '';
  }

  function poner(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = (v === null || v === undefined) ? '' : v;
  }

  function mostrar(tipo, html) {
    var mensaje = document.getElementById('mensaje');
    mensaje.className = 'mensaje ' + tipo;
    mensaje.innerHTML = html;
    mensaje.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function limpiarMensaje() {
    var mensaje = document.getElementById('mensaje');
    mensaje.className = 'mensaje';
    mensaje.innerHTML = '';
  }

  function opcion(select, value, texto) {
    var opt = document.createElement('option');
    opt.value = value;
    opt.textContent = texto;
    select.appendChild(opt);
  }

  /* Escuelas: llena el desplegable y guarda el mapa id -> escuela.
     Devuelve la lista cargada (vacía si falló). */
  function cargarEscuelas(selectEscuela) {
    return rpc('listar_escuelas').then(function (escuelas) {
      selectEscuela.innerHTML = '<option value="">Elige una escuela…</option>';
      if (!escuelas || escuelas.length === 0) {
        selectEscuela.innerHTML = '<option value="">No hay escuelas capturadas</option>';
        mostrar('error', 'Todavía no hay escuelas capturadas. Primero <a href="captura-escuela.html">captura una escuela</a>.');
        return [];
      }
      escuelas.forEach(function (e) {
        opcion(selectEscuela, e.id, e.nombre + (e.cct ? ' (' + e.cct + ')' : ''));
        escuelasPorId[e.id] = e;
      });
      return escuelas;
    }).catch(function () {
      selectEscuela.innerHTML = '<option value="">No se pudieron cargar las escuelas</option>';
      mostrar('error', 'No se pudieron cargar las escuelas. Revisa que el archivo SUPABASE_formularios_captura.sql ya se haya ejecutado en Supabase.');
      return [];
    });
  }

  function escuelaPorId(id) {
    return escuelasPorId[id] || null;
  }

  /* Turnos: llena el desplegable (páginas de alumno). */
  function cargarTurnos(selectTurno) {
    if (!selectTurno) return Promise.resolve([]);
    return rpc('listar_turnos').then(function (turnos) {
      (turnos || []).forEach(function (t) {
        opcion(selectTurno, t.id, t.nombre);
      });
      return turnos || [];
    }).catch(function () {
      mostrar('error', 'No se pudieron cargar los turnos. Revisa que el archivo SUPABASE_formularios_captura.sql ya se haya ejecutado en Supabase.');
      return [];
    });
  }

  /* Ciclos: llena el desplegable y deja marcado el actual. */
  function cargarCiclos(selectCiclo) {
    if (!selectCiclo) return Promise.resolve(null);
    return rpc('listar_ciclos').then(function (ciclos) {
      selectCiclo.innerHTML = '';
      if (!ciclos || ciclos.length === 0) {
        selectCiclo.innerHTML = '<option value="">No hay ciclos escolares</option>';
        mostrar('error', 'No hay ciclos escolares capturados. Captura uno en Supabase (tabla ciclo_escolar) y marca el actual.');
        return null;
      }
      ciclos.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        if (c.actual) { opt.selected = true; cicloActualId = String(c.id); }
        selectCiclo.appendChild(opt);
      });
      if (cicloActualId === null) {
        cicloActualId = String(ciclos[0].id);
        selectCiclo.value = cicloActualId;
      }
      return cicloActualId;
    }).catch(function () {
      selectCiclo.innerHTML = '<option value="">No se pudieron cargar los ciclos</option>';
      mostrar('error', 'No se pudieron cargar los ciclos escolares. Revisa que el archivo SUPABASE_formularios_captura.sql ya se haya ejecutado en Supabase.');
      return null;
    });
  }

  function getCicloActualId() {
    return cicloActualId;
  }

  /* Grados según el nivel de la escuela elegida.
     cat_grado tiene nivel_id: Preescolar (2) = 1°-3°, Primaria (3) =
     1°-6°, Secundaria (4) = 1°-3°. Sin escuela no hay grados.
     preselectId es opcional: si se da, deja ese grado seleccionado. */
  function cargarGrados(selectGrado, nivelId, preselectId) {
    selectGrado.innerHTML = '<option value="">Cargando grados…</option>';
    return rpc('listar_grados', { p_nivel_id: nivelId }).then(function (grados) {
      selectGrado.innerHTML = '<option value="">Elige un grado…</option>';
      if (!grados || grados.length === 0) {
        selectGrado.innerHTML = '<option value="">No hay grados para este nivel</option>';
        return [];
      }
      grados.forEach(function (g) {
        opcion(selectGrado, g.id, g.nombre);
      });
      if (preselectId) selectGrado.value = String(preselectId);
      return grados;
    }).catch(function () {
      selectGrado.innerHTML = '<option value="">No se pudieron cargar los grados</option>';
      return [];
    });
  }

  /* Niveles y sostenimientos (páginas de escuela). */
  function cargarNiveles(selectNivel) {
    if (!selectNivel) return Promise.resolve([]);
    return rpc('listar_niveles').then(function (niveles) {
      selectNivel.innerHTML = '<option value="">Elige un nivel…</option>';
      if (!niveles || niveles.length === 0) {
        selectNivel.innerHTML = '<option value="">No hay niveles</option>';
        return [];
      }
      niveles.forEach(function (n) {
        opcion(selectNivel, n.id, n.nombre);
      });
      return niveles;
    }).catch(function () {
      selectNivel.innerHTML = '<option value="">No se pudieron cargar los niveles</option>';
      mostrar('error', 'No se pudieron cargar los niveles. Revisa que el archivo SUPABASE_formularios_captura.sql ya se haya ejecutado en Supabase.');
      return [];
    });
  }

  function cargarSostenimientos(selectSostenimiento) {
    if (!selectSostenimiento) return Promise.resolve([]);
    return rpc('listar_sostenimientos').then(function (sostenimientos) {
      (sostenimientos || []).forEach(function (s) {
        opcion(selectSostenimiento, s.id, s.nombre);
      });
      return sostenimientos || [];
    }).catch(function () {
      /* el sostenimiento es opcional */
      return [];
    });
  }

  return {
    rpc: rpc,
    valor: valor,
    poner: poner,
    mostrar: mostrar,
    limpiarMensaje: limpiarMensaje,
    cargarEscuelas: cargarEscuelas,
    escuelaPorId: escuelaPorId,
    cargarTurnos: cargarTurnos,
    cargarCiclos: cargarCiclos,
    getCicloActualId: getCicloActualId,
    cargarGrados: cargarGrados,
    cargarNiveles: cargarNiveles,
    cargarSostenimientos: cargarSostenimientos,
    presentacionUrl: PRESENTACION_URL
  };
})();
