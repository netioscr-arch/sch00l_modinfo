/* Captura de escuela. Usa el código común de js/forms.js. */
(function () {
  'use strict';

  var F = Sch00lForms;

  var form = document.getElementById('form-escuela');
  var boton = document.getElementById('btn-guardar');
  var selectNivel = document.getElementById('nivel');
  var selectSostenimiento = document.getElementById('sostenimiento');

  F.cargarNiveles(selectNivel);
  F.cargarSostenimientos(selectSostenimiento);

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var nombre = F.valor('nombre');
    var cct = F.valor('cct');
    var nivelId = selectNivel.value;
    var sostenimientoId = selectSostenimiento.value;
    if (!nombre || !cct || !nivelId) {
      F.mostrar('error', 'Faltan datos: el nombre de la escuela, la CCT y el nivel son obligatorios.');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando…';
    F.limpiarMensaje();

    F.rpc('registrar_escuela', {
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
      F.mostrar('exito', '<strong>Escuela guardada:</strong> ' + nombre + ' (' + cct + ').<br>' +
        'Ya puedes <a href="captura-alumno">capturar alumnos de esta escuela</a>.');
      form.reset();
    })
    .catch(function (err) {
      F.mostrar('error', '<strong>No se pudo guardar.</strong> ' + (err.message || 'Intenta de nuevo más tarde.'));
    })
    .finally(function () {
      boton.disabled = false;
      boton.textContent = 'Guardar escuela';
    });
  });
})();
