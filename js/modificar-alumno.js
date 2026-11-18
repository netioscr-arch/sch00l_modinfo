/* Modificar alumno. Usa el código común de js/forms.js. */
(function () {
  'use strict';

  var F = Sch00lForms;

  var form = document.getElementById('form-alumno');
  var boton = document.getElementById('btn-guardar');
  var selectEscuela = document.getElementById('escuela');
  var selectAlumno = document.getElementById('alumno');
  var selectCiclo = document.getElementById('ciclo');
  var selectGrado = document.getElementById('grado');
  var selectTurno = document.getElementById('turno');
  var avisoCiclo = document.getElementById('aviso-ciclo');
  var alumnoId = null;
  var tokenPublico = null;

  function actualizarAvisoCiclo() {
    var cicloActualId = F.getCicloActualId();
    if (cicloActualId !== null && selectCiclo.value && selectCiclo.value !== cicloActualId) {
      avisoCiclo.classList.add('visible');
    } else {
      avisoCiclo.classList.remove('visible');
    }
  }
  selectCiclo.addEventListener('change', actualizarAvisoCiclo);

  function limpiarFormulario() {
    alumnoId = null;
    tokenPublico = null;
    ['nombres', 'apellido_paterno', 'apellido_materno', 'numero_alumno', 'grupo',
     'tutor_nombres', 'tutor_apellidos', 'tutor_correo', 'tutor_telefono'].forEach(function (id) {
      F.poner(id, '');
    });
    selectGrado.innerHTML = '<option value="">Elige primero una escuela…</option>';
    selectTurno.value = '';
    var cicloActualId = F.getCicloActualId();
    if (cicloActualId !== null) selectCiclo.value = cicloActualId;
    actualizarAvisoCiclo();
  }

  function cargarAlumnos(escuelaId) {
    selectAlumno.disabled = true;
    selectAlumno.innerHTML = '<option value="">Cargando alumnos…</option>';
    F.rpc('listar_alumnos', { p_escuela_id: escuelaId }).then(function (alumnos) {
      selectAlumno.innerHTML = '<option value="">Elige un alumno…</option>';
      if (!alumnos || alumnos.length === 0) {
        selectAlumno.innerHTML = '<option value="">No hay alumnos en esta escuela</option>';
        return;
      }
      alumnos.forEach(function (a) {
        var opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = (a.numero_alumno || '') + ' — ' + (a.nombre_completo || '') +
          ((a.grado || a.grupo) ? ' (' + [a.grado, a.grupo].filter(Boolean).join(' · ') + ')' : '');
        selectAlumno.appendChild(opt);
      });
      selectAlumno.disabled = false;
    }).catch(function () {
      selectAlumno.innerHTML = '<option value="">No se pudieron cargar los alumnos</option>';
      F.mostrar('error', 'No se pudieron cargar los alumnos. Revisa que el archivo SUPABASE_modificar_alumno_escuela.sql ya se haya ejecutado en Supabase.');
    });
  }

  selectEscuela.addEventListener('change', function () {
    limpiarFormulario();
    var esc = F.escuelaPorId(selectEscuela.value);
    if (!esc) {
      selectAlumno.innerHTML = '<option value="">Elige primero una escuela…</option>';
      selectAlumno.disabled = true;
      return;
    }
    if (esc.nivel_id) F.cargarGrados(selectGrado, esc.nivel_id);
    cargarAlumnos(esc.id);
  });

  selectAlumno.addEventListener('change', function () {
    alumnoId = selectAlumno.value || null;
    if (!alumnoId) { limpiarFormulario(); return; }
    F.rpc('obtener_alumno', { p_alumno_id: alumnoId }).then(function (data) {
      var row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('No se encontró el alumno.');
      tokenPublico = row.token_publico || null;
      F.poner('nombres', row.nombres);
      F.poner('apellido_paterno', row.apellido_paterno);
      F.poner('apellido_materno', row.apellido_materno);
      F.poner('numero_alumno', row.numero_alumno);
      F.poner('grupo', row.grupo);
      F.poner('tutor_nombres', row.tutor_nombres);
      F.poner('tutor_apellidos', row.tutor_apellidos);
      F.poner('tutor_correo', row.tutor_correo);
      F.poner('tutor_telefono', row.tutor_telefono);
      selectTurno.value = row.turno_id ? String(row.turno_id) : '';
      if (row.ciclo_id) selectCiclo.value = String(row.ciclo_id);
      actualizarAvisoCiclo();
      var esc = F.escuelaPorId(row.escuela_id);
      if (esc && esc.nivel_id) F.cargarGrados(selectGrado, esc.nivel_id, row.grado_id);
    }).catch(function (err) {
      F.mostrar('error', '<strong>No se pudo cargar el alumno.</strong> ' + (err.message || 'Intenta de nuevo más tarde.'));
    });
  });

  F.cargarTurnos(selectTurno);
  F.cargarCiclos(selectCiclo);
  F.cargarEscuelas(selectEscuela);

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var cicloId = selectCiclo.value;
    var nombres = F.valor('nombres');
    var apellidoPaterno = F.valor('apellido_paterno');
    var numeroAlumno = F.valor('numero_alumno');
    var grupo = F.valor('grupo');
    var gradoId = selectGrado.value;
    var turnoId = selectTurno.value;
    if (!alumnoId || !cicloId || !nombres || !apellidoPaterno || !numeroAlumno || !grupo || !gradoId) {
      F.mostrar('error', 'Faltan datos: elige un alumno y revisa que nombre, apellido paterno, número de alumno, grupo y grado estén completos.');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando…';
    F.limpiarMensaje();

    F.rpc('modificar_alumno', {
      p_alumno_id: alumnoId,
      p_nombres: nombres,
      p_apellido_paterno: apellidoPaterno,
      p_apellido_materno: F.valor('apellido_materno') || null,
      p_numero_alumno: numeroAlumno,
      p_grupo: grupo,
      p_grado_id: parseInt(gradoId, 10),
      p_turno_id: turnoId ? parseInt(turnoId, 10) : null,
      p_tutor_nombres: F.valor('tutor_nombres') || null,
      p_tutor_apellidos: F.valor('tutor_apellidos') || null,
      p_tutor_correo: F.valor('tutor_correo') || null,
      p_tutor_telefono: F.valor('tutor_telefono') || null,
      p_ciclo_id: parseInt(cicloId, 10)
    })
    .then(function (data) {
      var row = Array.isArray(data) ? data[0] : data;
      var token = (row && row.token_publico) || tokenPublico;
      var nombreCompleto = nombres + ' ' + apellidoPaterno + (F.valor('apellido_materno') ? ' ' + F.valor('apellido_materno') : '');
      var html = '<strong>Alumno actualizado:</strong> ' + nombreCompleto + '.';
      if (token) {
        var enlace = F.presentacionUrl + '?t=' + token;
        html += '<br>Su enlace de presentación sigue siendo el mismo:<span class="enlace-token">' + enlace + '</span>' +
          '<button type="button" class="btn-copiar" id="btn-copiar">Copiar enlace</button> ' +
          '<a href="' + enlace + '" target="_blank" rel="noopener">Ver presentación</a>';
      }
      F.mostrar('exito', html);
      var btnCopiar = document.getElementById('btn-copiar');
      if (btnCopiar) {
        btnCopiar.addEventListener('click', function () {
          if (navigator.clipboard && token) {
            navigator.clipboard.writeText(F.presentacionUrl + '?t=' + token).then(function () {
              btnCopiar.textContent = 'Copiado';
            });
          }
        });
      }
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
