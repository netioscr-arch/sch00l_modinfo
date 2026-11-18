/* Modificar escuela. Usa el código común de js/forms.js. */
(function () {
  'use strict';

  var F = Sch00lForms;

  var form = document.getElementById('form-escuela');
  var boton = document.getElementById('btn-guardar');
  var selectEscuela = document.getElementById('escuela');
  var selectNivel = document.getElementById('nivel');
  var selectSostenimiento = document.getElementById('sostenimiento');
  var escuelaId = null;

  F.cargarNiveles(selectNivel);
  F.cargarSostenimientos(selectSostenimiento);
  F.cargarEscuelas(selectEscuela);

  selectEscuela.addEventListener('change', function () {
    escuelaId = selectEscuela.value || null;
    if (!escuelaId) return;
    F.rpc('obtener_escuela', { p_escuela_id: escuelaId }).then(function (data) {
      var row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('No se encontró la escuela.');
      F.poner('nombre', row.nombre);
      F.poner('cct', row.cct);
      F.poner('sector', row.sector);
      F.poner('zona_escolar', row.zona_escolar);
      F.poner('eslogan', row.eslogan);
      F.poner('correo', row.correo);
      F.poner('calle', row.calle);
      F.poner('colonia', row.colonia);
      F.poner('codigo_postal', row.codigo_postal);
      F.poner('municipio', row.municipio);
      F.poner('estado', row.estado);
      F.poner('logo_url', row.logo_url);
      selectNivel.value = row.nivel_id ? String(row.nivel_id) : '';
      selectSostenimiento.value = row.sostenimiento_id ? String(row.sostenimiento_id) : '';
    }).catch(function (err) {
      F.mostrar('error', '<strong>No se pudo cargar la escuela.</strong> ' + (err.message || 'Intenta de nuevo más tarde.'));
    });
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var nombre = F.valor('nombre');
    var cct = F.valor('cct');
    var nivelId = selectNivel.value;
    var sostenimientoId = selectSostenimiento.value;
    if (!escuelaId || !nombre || !cct || !nivelId) {
      F.mostrar('error', 'Faltan datos: elige una escuela y revisa que el nombre, la CCT y el nivel estén completos.');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando…';
    F.limpiarMensaje();

    F.rpc('modificar_escuela', {
      p_escuela_id: escuelaId,
      p_nombre: nombre,
      p_cct: cct,
      p_nivel_id: parseInt(nivelId, 10),
      p_eslogan: F.valor('eslogan') || null,
      p_correo: F.valor('correo') || null,
      p_municipio: F.valor('municipio') || null,
      p_sector: F.valor('sector') || null,
      p_zona_escolar: F.valor('zona_escolar') || null,
      p_calle: F.valor('calle') || null,
      p_colonia: F.valor('colonia') || null,
      p_codigo_postal: F.valor('codigo_postal') || null,
      p_estado: F.valor('estado') || null,
      p_logo_url: F.valor('logo_url') || null,
      p_sostenimiento_id: sostenimientoId ? parseInt(sostenimientoId, 10) : null
    })
    .then(function () {
      F.mostrar('exito', '<strong>Escuela actualizada:</strong> ' + nombre + ' (' + cct + ').<br>' +
        'Ya puedes <a href="modificar-alumno.html">modificar alumnos de esta escuela</a>.');
    })
    .catch(function (err) {
      F.mostrar('error', '<strong>No se pudo guardar.</strong> ' + (err.message || 'Intenta de nuevo más tarde.'));
    })
    .finally(function () {
      boton.disabled = false;
      boton.textContent = 'Guardar cambios';
    });
  });
})();
