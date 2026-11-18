-- ============================================================================
-- Modificar alumno y modificar escuela — sch00l_modinfo
-- Proyecto Supabase: info_w0rk2.0 (aghllznrmjmhjxzbzito)
-- Ejecutar en: Supabase > SQL Editor > New query > pegar todo > Run
-- BORRADOR preparado el 18 nov 2026 — ejecutado el mismo día.
-- CORRECCIÓN 18 nov 2026: la prueba en vivo falló con
-- 'column reference "token_publico" is ambiguous' al guardar un alumno:
-- modificar_alumno devuelve token_publico como columna de salida y el
-- SELECT inicial lo referenciaba sin calificar; ahora se califica
-- a.escuela_id / a.token_publico. Re-ejecutar el archivo completo
-- (CREATE OR REPLACE) para aplicar la corrección.
-- ============================================================================
-- Qué hace este archivo (sigue el mismo patrón que
-- SUPABASE_formularios_captura.sql, con funciones SECURITY DEFINER y
-- grant a anon/authenticated, igual que registrar_alumno/escuela):
--   listar_alumnos(p_escuela_id) -> alumnos de una escuela, para elegir
--     cuál editar (número, nombre, grado, grupo, token).
--   obtener_alumno(p_alumno_id)  -> todos los campos editables de un
--     alumno, con su inscripción del ciclo actual y su tutor, para
--     prellenar el formulario de edición.
--   modificar_alumno(...)        -> actualiza alumno + inscripción
--     (grupo, grado, turno, ciclo) + tutor. NO cambia la escuela del
--     alumno ni su token_publico: el enlace de presentación sigue igual.
--   obtener_escuela(p_escuela_id) -> todos los campos de una escuela,
--     para prellenar el formulario de edición.
--   modificar_escuela(...)       -> actualiza la escuela. La CCT debe
--     seguir siendo única, sin contar a la propia escuela.
--
-- Decisiones que ya quedaron fijas en este borrador:
--   * El número de alumno sigue siendo único por escuela: si se cambia,
--     se verifica que no exista otro alumno con ese número en la misma
--     escuela (igual que al registrar).
--   * Grado y turno se guardan como id de catálogo Y como nombre en
--     texto (grado/turno), igual que registrar_alumno, para que la
--     presentación no cambie.
--   * Si el alumno ya tiene tutor, se actualiza ese tutor. Si no tiene
--     y se escribe un nombre, se crea y se enlaza en alumno_tutor.
--     Si se deja el nombre del tutor en blanco, el tutor que ya tenía
--     NO se borra (para no perder el contacto por un campo vacío
--     accidental). Borrar un tutor, si hace falta, es otro cambio.
--   * La inscripción que se edita es la del ciclo actual (la que lee
--     buscar_alumno). Si se cambia el ciclo a uno que no es el actual,
--     la presentación con ?t= dejará de mostrar al alumno hasta que
--     ese ciclo sea el actual — el formulario debe advertirlo.
--
-- ANTES DE EJECUTAR, verificar en el SQL Editor (la definición exacta
-- de tutor no quedó registrada en los archivos locales):
--   select column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name in
--    ('tutor','alumno_tutor','inscripcion','alumno','escuela')
--    order by table_name, ordinal_position;
-- Puntos a confirmar con esa consulta:
--   * tutor: registrar_alumno inserta (alumno_id, nombres, correo,
--     telefono); buscar_alumno lee tt.nombres y tt.apellidos.
--     VERIFICADO 18 nov 2026: tutor sí tiene apellidos (text) y 100 de
--     103 tutores lo tienen con datos, así que obtener_alumno devuelve
--     tutor_nombres y tutor_apellidos por separado y modificar_alumno
--     actualiza ambos; el formulario de edición lleva los dos campos.
--   * alumno_tutor: se usa (alumno_id, tutor_id); la presentación
--     ordena por atu.created_at, así que esa columna debe existir.
--   * inscripcion: se usa su id para actualizar la fila del ciclo
--     actual; si un alumno tuviera varias inscripciones, la que se
--     edita es la del ciclo marcado actual = true.
--
-- Páginas que faltan (no están en este archivo): dos páginas nuevas en
-- el mismo sitio Vercel, copiando el estilo y los desplegables de las
-- de captura:
--   modificar-alumno.html: escuela -> listar_alumnos -> elegir alumno
--     -> obtener_alumno -> mismo formulario que captura-alumno.html
--     prellenado -> modificar_alumno. Al guardar, mostrar el mismo
--     enlace de presentación (?t= con el token que ya tenía).
--   modificar-escuela.html: listar_escuelas -> elegir escuela ->
--     obtener_escuela -> mismo formulario que captura-escuela.html
--     prellenado -> modificar_escuela.
-- Al probar, usar alumnos/escuelas de prueba y borrarlos después,
-- como se hizo el 17 nov.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Listar alumnos de una escuela (para elegir cuál editar)
-- --------------------------------------------------------------------------
create or replace function public.listar_alumnos(p_escuela_id uuid)
returns table(id uuid, numero_alumno text, nombre_completo text,
              grado text, grupo text, token_publico text)
language sql
security definer
stable
as $$
  select a.id, a.numero_alumno,
         concat_ws(' ', a.nombres, a.apellido_paterno, a.apellido_materno)::text,
         i.grado, i.grupo, a.token_publico
  from public.alumno a
  left join lateral (
    select ii.grado, ii.grupo
    from public.inscripcion ii
    left join public.ciclo_escolar cc on cc.id = ii.ciclo_id and cc.actual
    where ii.alumno_id = a.id
    order by (cc.actual is true) desc, ii.ciclo_id desc
    limit 1
  ) i on true
  where a.escuela_id = p_escuela_id
  order by a.numero_alumno, a.apellido_paterno, a.nombres;
$$;

grant execute on function public.listar_alumnos(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Obtener un alumno con todo lo editable (para prellenar el formulario)
-- --------------------------------------------------------------------------
create or replace function public.obtener_alumno(p_alumno_id uuid)
returns table(alumno_id uuid, escuela_id uuid, escuela_nombre text,
              nivel_id smallint, nombres text, apellido_paterno text,
              apellido_materno text, numero_alumno text, grupo text,
              grado_id smallint, turno_id smallint, ciclo_id smallint,
              tutor_nombres text, tutor_apellidos text, tutor_correo text,
              tutor_telefono text, token_publico text)
language sql
security definer
stable
as $$
  select a.id, a.escuela_id, e.nombre, e.nivel_id,
         a.nombres, a.apellido_paterno, a.apellido_materno,
         a.numero_alumno, i.grupo, i.grado_id, i.turno_id, i.ciclo_id,
         tu.nombres, tu.apellidos,
         tu.correo, tu.telefono, a.token_publico
  from public.alumno a
  join public.escuela e on e.id = a.escuela_id
  left join lateral (
    select ii.grupo, ii.grado_id, ii.turno_id, ii.ciclo_id
    from public.inscripcion ii
    left join public.ciclo_escolar cc on cc.id = ii.ciclo_id and cc.actual
    where ii.alumno_id = a.id
    order by (cc.actual is true) desc, ii.ciclo_id desc
    limit 1
  ) i on true
  left join lateral (
    select tt.nombres, tt.apellidos, tt.correo, tt.telefono
    from public.alumno_tutor atu
    join public.tutor tt on tt.id = atu.tutor_id
    where atu.alumno_id = a.id
    order by atu.created_at
    limit 1
  ) tu on true
  where a.id = p_alumno_id
  limit 1;
$$;

grant execute on function public.obtener_alumno(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Modificar alumno
-- --------------------------------------------------------------------------
create or replace function public.modificar_alumno(
  p_alumno_id uuid,
  p_nombres text,
  p_apellido_paterno text,
  p_apellido_materno text default null,
  p_numero_alumno text default null,
  p_grupo text default null,
  p_grado_id smallint default null,
  p_turno_id smallint default null,
  p_tutor_nombres text default null,
  p_tutor_apellidos text default null,
  p_tutor_correo text default null,
  p_tutor_telefono text default null,
  p_ciclo_id smallint default null
)
returns table(alumno_id uuid, token_publico text)
language plpgsql
security definer
as $$
declare
  v_escuela_id uuid;
  v_token text;
  v_ciclo_id smallint;
  v_grado_nombre text;
  v_turno_nombre text;
  v_insc_id uuid;
  v_tutor_id uuid;
begin
  select a.escuela_id, a.token_publico into v_escuela_id, v_token
  from public.alumno a where a.id = p_alumno_id;
  if v_escuela_id is null then
    raise exception 'El alumno no existe';
  end if;
  if p_nombres is null or btrim(p_nombres) = '' then
    raise exception 'El nombre del alumno es obligatorio';
  end if;
  if p_apellido_paterno is null or btrim(p_apellido_paterno) = '' then
    raise exception 'El apellido paterno es obligatorio';
  end if;
  if p_numero_alumno is null or btrim(p_numero_alumno) = '' then
    raise exception 'El número de alumno es obligatorio';
  end if;
  if exists (select 1 from public.alumno
             where escuela_id = v_escuela_id
               and numero_alumno = btrim(p_numero_alumno)
               and id <> p_alumno_id) then
    raise exception 'Ya existe otro alumno con el número % en esta escuela', btrim(p_numero_alumno);
  end if;
  if p_grupo is null or btrim(p_grupo) = '' then
    raise exception 'El grupo es obligatorio';
  end if;
  if p_grado_id is null then
    raise exception 'El grado es obligatorio';
  end if;
  select nombre into v_grado_nombre from public.cat_grado where id = p_grado_id;
  if v_grado_nombre is null then
    raise exception 'El grado elegido no existe';
  end if;
  if p_turno_id is not null then
    select nombre into v_turno_nombre from public.cat_turno where id = p_turno_id;
    if v_turno_nombre is null then
      raise exception 'El turno elegido no existe';
    end if;
  end if;
  if p_ciclo_id is null then
    select id into v_ciclo_id from public.ciclo_escolar
    where actual is true order by id desc limit 1;
    if v_ciclo_id is null then
      raise exception 'No hay un ciclo escolar activo';
    end if;
  else
    if not exists (select 1 from public.ciclo_escolar where id = p_ciclo_id) then
      raise exception 'El ciclo escolar elegido no existe';
    end if;
    v_ciclo_id := p_ciclo_id;
  end if;

  update public.alumno set
    nombres = btrim(p_nombres),
    apellido_paterno = btrim(p_apellido_paterno),
    apellido_materno = nullif(btrim(coalesce(p_apellido_materno, '')), ''),
    numero_alumno = btrim(p_numero_alumno)
  where id = p_alumno_id;

  -- Inscripción del ciclo actual; si no hay una del ciclo actual, se
  -- toma la más reciente del alumno (por ciclo_id descendente).
  select i.id into v_insc_id
  from public.inscripcion i
  left join public.ciclo_escolar c on c.id = i.ciclo_id and c.actual
  where i.alumno_id = p_alumno_id
  order by (c.actual is true) desc, i.ciclo_id desc
  limit 1;

  if v_insc_id is null then
    raise exception 'El alumno no tiene inscripción para editar';
  end if;

  update public.inscripcion set
    grupo = btrim(p_grupo),
    grado = v_grado_nombre,
    turno = v_turno_nombre,
    ciclo_id = v_ciclo_id,
    grado_id = p_grado_id,
    turno_id = p_turno_id
  where id = v_insc_id;

  -- Tutor: actualizar el enlazado, o crearlo si no tenía y ahora trae nombre.
  select atu.tutor_id into v_tutor_id
  from public.alumno_tutor atu
  where atu.alumno_id = p_alumno_id
  order by atu.created_at
  limit 1;

  if v_tutor_id is not null then
    update public.tutor set
      nombres = btrim(p_tutor_nombres),
      apellidos = nullif(btrim(coalesce(p_tutor_apellidos, '')), ''),
      correo = nullif(btrim(coalesce(p_tutor_correo, '')), ''),
      telefono = nullif(btrim(coalesce(p_tutor_telefono, '')), '')
    where id = v_tutor_id
      and p_tutor_nombres is not null and btrim(p_tutor_nombres) <> '';
  elsif p_tutor_nombres is not null and btrim(p_tutor_nombres) <> '' then
    insert into public.tutor (alumno_id, nombres, apellidos, correo, telefono)
    values (p_alumno_id, btrim(p_tutor_nombres),
            nullif(btrim(coalesce(p_tutor_apellidos, '')), ''),
            nullif(btrim(coalesce(p_tutor_correo, '')), ''),
            nullif(btrim(coalesce(p_tutor_telefono, '')), ''))
    returning id into v_tutor_id;
    insert into public.alumno_tutor (alumno_id, tutor_id)
    values (p_alumno_id, v_tutor_id);
  end if;

  return query select p_alumno_id, v_token;
end;
$$;

grant execute on function public.modificar_alumno(
  uuid, text, text, text, text, text, smallint, smallint, text, text, text, text, smallint
) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Obtener una escuela con todo lo editable (para prellenar el formulario)
-- --------------------------------------------------------------------------
create or replace function public.obtener_escuela(p_escuela_id uuid)
returns table(escuela_id uuid, nombre text, cct text, nivel_id smallint,
              sostenimiento_id smallint, eslogan text, correo text,
              municipio text, sector text, zona_escolar text, calle text,
              colonia text, codigo_postal text, estado text, logo_url text)
language sql
security definer
stable
as $$
  select id, nombre, cct, nivel_id, sostenimiento_id, eslogan, correo,
         municipio, sector, zona_escolar, calle, colonia, codigo_postal,
         estado, logo_url
  from public.escuela
  where id = p_escuela_id
  limit 1;
$$;

grant execute on function public.obtener_escuela(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. Modificar escuela (mismos campos que registrar_escuela, más el id)
-- --------------------------------------------------------------------------
create or replace function public.modificar_escuela(
  p_escuela_id uuid,
  p_nombre text,
  p_cct text,
  p_nivel_id smallint,
  p_eslogan text default null,
  p_correo text default null,
  p_municipio text default null,
  p_sector text default null,
  p_zona_escolar text default null,
  p_calle text default null,
  p_colonia text default null,
  p_codigo_postal text default null,
  p_estado text default null,
  p_logo_url text default null,
  p_sostenimiento_id smallint default null
)
returns uuid
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.escuela where id = p_escuela_id) then
    raise exception 'La escuela no existe';
  end if;
  if p_nombre is null or btrim(p_nombre) = '' then
    raise exception 'El nombre de la escuela es obligatorio';
  end if;
  if p_cct is null or btrim(p_cct) = '' then
    raise exception 'La CCT es obligatoria';
  end if;
  if p_nivel_id is null then
    raise exception 'El nivel es obligatorio';
  end if;
  if not exists (select 1 from public.cat_nivel_educativo where id = p_nivel_id) then
    raise exception 'El nivel elegido no existe';
  end if;
  if p_sostenimiento_id is not null
    and not exists (select 1 from public.cat_sostenimiento where id = p_sostenimiento_id) then
    raise exception 'El sostenimiento elegido no existe';
  end if;
  if exists (select 1 from public.escuela
             where cct = btrim(p_cct) and id <> p_escuela_id) then
    raise exception 'Ya existe otra escuela con la CCT %', btrim(p_cct);
  end if;

  update public.escuela set
    nombre = btrim(p_nombre),
    cct = btrim(p_cct),
    nivel_id = p_nivel_id,
    sostenimiento_id = p_sostenimiento_id,
    eslogan = nullif(btrim(coalesce(p_eslogan, '')), ''),
    correo = nullif(btrim(coalesce(p_correo, '')), ''),
    municipio = nullif(btrim(coalesce(p_municipio, '')), ''),
    sector = nullif(btrim(coalesce(p_sector, '')), ''),
    zona_escolar = nullif(btrim(coalesce(p_zona_escolar, '')), ''),
    calle = nullif(btrim(coalesce(p_calle, '')), ''),
    colonia = nullif(btrim(coalesce(p_colonia, '')), ''),
    codigo_postal = nullif(btrim(coalesce(p_codigo_postal, '')), ''),
    estado = nullif(btrim(coalesce(p_estado, '')), ''),
    logo_url = nullif(btrim(coalesce(p_logo_url, '')), '')
  where id = p_escuela_id;

  return p_escuela_id;
end;
$$;

grant execute on function public.modificar_escuela(
  uuid, text, text, smallint, text, text, text, text, text, text, text, text, text, text, smallint
) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 6. Comprobación rápida (después de Run)
-- --------------------------------------------------------------------------
-- select proname, pg_get_function_identity_arguments(oid) from pg_proc
--  where proname in ('listar_alumnos','obtener_alumno','modificar_alumno',
--                    'obtener_escuela','modificar_escuela')
--  order by proname;
-- select * from public.listar_alumnos('<id de una escuela>');
-- select * from public.obtener_escuela('<id de una escuela>');
-- ============================================================================
