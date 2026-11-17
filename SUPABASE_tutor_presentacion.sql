-- ============================================================================
-- Tutor visible en la presentación + alumno sin turno también tiene página
-- Proyecto Supabase: aghllznrmjmhjxzbzito
-- Ejecutar en: Supabase > SQL Editor > New query > pegar todo > Run
-- ============================================================================
-- Por qué:
-- 1) buscar_alumno lee el tutor por la tabla puente alumno_tutor, no por
--    tutor.alumno_id. registrar_alumno creaba el tutor pero no el enlace,
--    así que la presentación devolvía tutor, teléfono y correo en null.
--    Ahora, al crear el tutor, también se inserta en alumno_tutor.
-- 2) buscar_alumno hacía JOIN (no LEFT JOIN) con cat_turno: un alumno
--    guardado sin turno ("Sin especificar") no tenía página de
--    presentación. Ahora es LEFT JOIN, igual que el tutor.
-- ============================================================================

create or replace function public.registrar_alumno(
  p_escuela_id uuid,
  p_nombres text,
  p_apellido_paterno text,
  p_apellido_materno text default null,
  p_numero_alumno text default null,
  p_grupo text default null,
  p_grado_id smallint default null,
  p_turno_id smallint default null,
  p_tutor_nombres text default null,
  p_tutor_correo text default null,
  p_tutor_telefono text default null,
  p_ciclo_id smallint default null
)
returns table(alumno_id uuid, token_publico text)
language plpgsql
security definer
as $$
declare
  v_alumno_id uuid;
  v_token text;
  v_ciclo_id smallint;
  v_grado_nombre text;
  v_turno_nombre text;
  v_tutor_id uuid;
begin
  if p_escuela_id is null then
    raise exception 'Falta la escuela';
  end if;
  if not exists (select 1 from public.escuela where id = p_escuela_id) then
    raise exception 'La escuela elegida no existe';
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
             where escuela_id = p_escuela_id
               and numero_alumno = btrim(p_numero_alumno)) then
    raise exception 'Ya existe un alumno con el número % en esta escuela', btrim(p_numero_alumno);
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

  -- Ciclo escolar actual (inscripcion.ciclo_id es obligatorio y referencia
  -- a ciclo_escolar.id). Si el formulario no manda p_ciclo_id, se toma
  -- el ciclo marcado actual = true; si lo manda, se verifica que exista.
  if p_ciclo_id is null then
    select id into v_ciclo_id
    from public.ciclo_escolar
    where actual is true
    order by id desc
    limit 1;
    if v_ciclo_id is null then
      raise exception 'No hay un ciclo escolar activo. Marca un ciclo como actual en la tabla ciclo_escolar';
    end if;
  else
    if not exists (select 1 from public.ciclo_escolar where id = p_ciclo_id) then
      raise exception 'El ciclo escolar elegido no existe';
    end if;
    v_ciclo_id := p_ciclo_id;
  end if;

  loop
    v_token := encode(gen_random_bytes(16), 'hex');
    exit when not exists (select 1 from public.alumno where alumno.token_publico = v_token);
  end loop;

  insert into public.alumno
    (escuela_id, nombres, apellido_paterno, apellido_materno,
     numero_alumno, token_publico)
  values
    (p_escuela_id, btrim(p_nombres), btrim(p_apellido_paterno),
     nullif(btrim(coalesce(p_apellido_materno, '')), ''),
     nullif(btrim(coalesce(p_numero_alumno, '')), ''),
     v_token)
  returning id into v_alumno_id;

  insert into public.inscripcion
    (alumno_id, escuela_id, grupo, grado, turno, ciclo_id, grado_id, turno_id)
  values
    (v_alumno_id, p_escuela_id,
     btrim(p_grupo),
     v_grado_nombre,
     v_turno_nombre,
     v_ciclo_id,
     p_grado_id,
     p_turno_id);

  if p_tutor_nombres is not null and btrim(p_tutor_nombres) <> '' then
    insert into public.tutor
      (alumno_id, nombres, correo, telefono)
    values
      (v_alumno_id, btrim(p_tutor_nombres),
       nullif(btrim(coalesce(p_tutor_correo, '')), ''),
       nullif(btrim(coalesce(p_tutor_telefono, '')), ''))
    returning id into v_tutor_id;

    -- La presentación (buscar_alumno) lee el tutor por la tabla puente
    -- alumno_tutor, no por tutor.alumno_id.
    insert into public.alumno_tutor (alumno_id, tutor_id)
    values (v_alumno_id, v_tutor_id);
  end if;

  return query select v_alumno_id, v_token;
end;
$$;

grant execute on function public.registrar_alumno(
  uuid, text, text, text, text, text, smallint, smallint, text, text, text, smallint
) to anon, authenticated;

-- buscar_alumno: mismo cuerpo que tenía, salvo el turno que pasa de JOIN
-- a LEFT JOIN para que un alumno sin turno también tenga presentación.
create or replace function public.buscar_alumno(p_token text)
 returns table(escuela text, logo text, eslogan text, numero_alumno text, nombre_completo text, grado text, grupo text, turno text, tutor text, telefono text, correo text)
 language sql
 stable security definer
 set search_path to 'public'
 as $function$
 select
   e.nombre::text                                                    as escuela,
   e.logo_url::text                                                  as logo,
   e.eslogan::text                                                   as eslogan,
   a.numero_alumno::text                                             as numero_alumno,
   concat_ws(' ', a.nombres, a.apellido_paterno, a.apellido_materno)::text as nombre_completo,
   g.nombre::text                                                    as grado,
   i.grupo::text                                                     as grupo,
   t.nombre::text                                                    as turno,
   tu.nombre::text                                                   as tutor,
   tu.telefono::text                                                 as telefono,
   tu.correo::text                                                   as correo
 from public.alumno a
 join public.escuela e      on e.id = a.escuela_id
 join public.inscripcion i  on i.alumno_id = a.id
 join public.ciclo_escolar c on c.id = i.ciclo_id and c.actual
 join public.cat_grado g    on g.id = i.grado_id
 left join public.cat_turno t on t.id = i.turno_id
 left join lateral (
   select
     concat_ws(' ', tt.nombres, tt.apellidos) as nombre,
     tt.telefono,
     tt.correo
   from public.alumno_tutor atu
   join public.tutor tt on tt.id = atu.tutor_id
   where atu.alumno_id = a.id
   order by atu.created_at
   limit 1
 ) tu on true
 where a.token_publico = p_token
 limit 1;
 $function$;

-- Comprobación: debe devolver la versión de 12 parámetros con grado_id
-- y turno_id, y buscar_alumno con 1 parámetro.
select proname, pg_get_function_identity_arguments(oid)
from pg_proc
where proname in ('registrar_alumno', 'buscar_alumno')
order by proname, pg_get_function_identity_arguments(oid);
