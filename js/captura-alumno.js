/* Captura de alumno. Usa el código común de js/forms.js. */
(function () {
  'use strict';

  var F = Sch00lForms;

  var form = document.getElementById('form-alumno');
  var boton = document.getElementById('btn-guardar');
  var selectEscuela = document.getElementById('escuela');
  var selectCiclo = document.getElementById('ciclo');
  var selectGrado = document.getElementById('grado');
  var selectTurno = document.getElementById('turno');

  selectEscuela.addEventListener('change', function () {
    var esc = F.escuelaPorId(selectEscuela.value);
    if (esc && esc.nivel_id) {
      F.cargarGrados(selectGrado, esc.nivel_id);
    } else {
      selectGrado.innerHTML = '<option value="">Elige primero una escuela…</option>';
    }
  });

  F.cargarTurnos(selectTurno);
  F.cargarCiclos(selectCiclo);
  F.cargarEscuelas(selectEscuela);

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var escuelaId = selectEscuela.value;
    var cicloId = selectCiclo.value;
    var nombres = F.valor('nombres');
    var apellidoPaterno = F.valor('apellido_paterno');
    var numeroAlumno = F.valor('numero_alumno');
    var grupo = F.valor('grupo');
    var gradoId = selectGrado.value;
    var turnoId = selectTurno.value;
    if (!escuelaId || !cicloId || !nombres || !apellidoPaterno || !numeroAlumno || !grupo || !gradoId) {
      F.mostrar('error', 'Faltan datos: escuela, ciclo escolar, nombre, apellido paterno, número de alumno, grupo y grado son obligatorios.');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando…';
    F.limpiarMensaje();

    F.rpc('registrar_alumno', {
      p_escuela_id: escuelaId,
      p_nombres: nombres,
      p_apellido_paterno: apellidoPaterno,
      p_apellido_materno: F.valor('apellido_materno') || null,
      p_numero_alumno: numeroAlumno,
      p_grupo: grupo,
      p_grado_id: parseInt(gradoId, 10),
      p_turno_id: turnoId ? parseInt(turnoId, 10) : null,
      p_tutor_nombres: F.valor('tutor_nombres') || null,
      p_tutor_correo: F.valor('tutor_correo') || null,
      p_tutor_telefono: F.valor('tutor_telefono') || null,
      p_ciclo_id: parseInt(cicloId, 10)
    })
    .then(function (data) {
      var row = Array.isArray(data) ? data[0] : data;
      var token = row && row.token_publico;
      if (!token) throw new Error('Se guardó, pero no se recibió el enlace. Búscalo por su número de alumno.');
      var enlace = F.presentacionUrl + '?t=' + token;
      var nombreCompleto = nombres + ' ' + apellidoPaterno + (F.valor('apellido_materno') ? ' ' + F.valor('apellido_materno') : '');
      F.mostrar('exito', '<strong>Alumno guardado:</strong> ' + nombreCompleto + '.<br>' +
        'Su enlace de presentación es:<span class="enlace-token">' + enlace + '</span>' +
        '<button type="button" class="btn-copiar" id="btn-copiar">Copiar enlace</button> ' +
        '<a href="' + enlace + '" target="_blank" rel="noopener">Ver presentación</a>');
      document.getElementById('btn-copiar').addEventListener('click', function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(enlace).then(function () {
            document.getElementById('btn-copiar').textContent = 'Copiado';
          });
        }
      });
      form.reset();
      var cicloActualId = F.getCicloActualId();
      if (cicloActualId !== null) selectCiclo.value = cicloActualId;
    })
    .catch(function (err) {
      F.mostrar('error', '<strong>No se pudo guardar.</strong> ' + (err.message || 'Intenta de nuevo más tarde.'));
    })
    .finally(function () {
      boton.disabled = false;
      boton.textContent = 'Guardar alumno';
    });
  });
})();
