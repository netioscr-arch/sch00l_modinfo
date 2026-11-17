-- ============================================================================
-- Formularios de captura — sch00l_modinfo
-- Proyecto Supabase: aghllznrmjmhjxzbzito
-- Ejecutar en: Supabase > SQL Editor > New query > pegar todo > Run
-- ============================================================================
-- Qué hace este archivo:
--   1. Agrega las columnas que faltaban: grado y turno en inscripcion,
--      y alumno_id en tutor (para saber de qué alumno es cada tutor).
--   2. Crea 3 funciones RPC que el formulario público puede llamar con la
--      llave pública (anon), igual que buscar_alumno:
--        listar_escuelas()   -> lista de escuelas para el desplegable
--        registrar_escuela() -> guarda una escuela nueva
--        registrar_alumno()  -> guarda alumno + inscripción + tutor,
--                               y genera su token_publico
--   Las funciones son SECURITY DEFINER: se ejecutan con permisos del dueño
--   de la base, así el formulario guarda sin exponer la service_role key.
--   Solo estas 3 funciones quedan abiertas para anon; nada más cambia.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Columnas que faltan
-- --------------------------------------------------------------------------
alter table public.inscripcion
  add column if not exists grado text;

alter table public.inscripcion
  add column if not exists turno text;

alter table public.tutor
  add column if not exists alumno_id uuid references public.alumno(id) on delete cascade;

-- --------------------------------------------------------------------------
-- 2. Listar escuelas (para el desplegable del formulario de alumno)
--    Incluye nivel_id: el desplegable de grados se filtra por el nivel
--    de la escuela elegida (cat_grado.nivel_id).
-- --------------------------------------------------------------------------
drop function if exists public.listar_escuelas();

create or replace function public.listar_escuelas()
returns table(id uuid, nombre text, cct text, nivel_id smallint)
language sql
security definer
stable
as $$
  select id, nombre, cct, nivel_id
  from public.escuela
  order by nombre;
$$;

grant execute on function public.listar_escuelas() to anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Registrar escuela
--    Devuelve el id de la escuela creada.
--    La CCT no se puede repetir: si ya existe, marca error.
--    El nivel es obligatorio (escuela.nivel_id, catálogo
--    cat_nivel_educativo) y se elige en un desplegable del formulario;
--    el sostenimiento es opcional (catálogo cat_sostenimiento).
-- --------------------------------------------------------------------------
create or replace function public.registrar_escuela(
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
declare
  v_id uuid;
begin
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
  if exists (select 1 from public.escuela where cct = btrim(p_cct)) then
    raise exception 'Ya existe una escuela con la CCT %', btrim(p_cct);
  end if;

  insert into public.escuela
    (nombre, cct, nivel_id, sostenimiento_id, eslogan, correo, municipio,
     sector, zona_escolar, calle, colonia, codigo_postal, estado, logo_url)
  values
    (btrim(p_nombre), btrim(p_cct), p_nivel_id, p_sostenimiento_id,
     nullif(btrim(coalesce(p_eslogan, '')), ''),
     nullif(btrim(coalesce(p_correo, '')), ''),
     nullif(btrim(coalesce(p_municipio, '')), ''),
     nullif(btrim(coalesce(p_sector, '')), ''),
     nullif(btrim(coalesce(p_zona_escolar, '')), ''),
     nullif(btrim(coalesce(p_calle, '')), ''),
     nullif(btrim(coalesce(p_colonia, '')), ''),
     nullif(btrim(coalesce(p_codigo_postal, '')), ''),
     nullif(btrim(coalesce(p_estado, '')), ''),
     nullif(btrim(coalesce(p_logo_url, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.registrar_escuela(
  text, text, smallint, text, text, text, text, text, text, text, text, text, text, smallint
) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Registrar alumno
--    Guarda el alumno, su inscripción (grupo, grado, turno) y su tutor,
--    genera el token_publico y lo devuelve junto con el id.
--    El enlace de presentación se arma así:
--      https://sch00l-modinfo.vercel.app/?t=<token_publico>
-- --------------------------------------------------------------------------
-- Se elimina la versión anterior de 11 parámetros (sin ciclo) para que
-- solo quede una versión del formulario: la de 12 parámetros con
-- p_ciclo_id. La versión vieja de 14 parámetros no se toca.
drop function if exists public.registrar_alumno(
  uuid, text, text, text, text, text, text, text, text, text, text
);

-- Se elimina la versión de 12 parámetros con p_grado/p_turno en texto,
-- porque el grado y el turno ahora son catálogos (p_grado_id/p_turno_id).
drop function if exists public.registrar_alumno(
  uuid, text, text, text, text, text, text, text, text, text, text, smallint
);

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

  -- Token público único (32 caracteres hexadecimales)
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

-- Catálogos para los desplegables de los formularios.
create or replace function public.listar_ciclos()
returns table(id smallint, nombre text, actual boolean)
language sql
security definer
as $$
  select id, nombre, actual
  from public.ciclo_escolar
  order by id desc;
$$;

grant execute on function public.listar_ciclos() to anon, authenticated;

-- Grados filtrados por nivel: cat_grado tiene nivel_id (2 Preescolar =
-- 1°-3°, 3 Primaria = 1°-6°, 4 Secundaria = 1°-3°), así el desplegable
-- solo muestra los grados de la escuela elegida. Sin p_nivel_id
-- devuelve todos.
drop function if exists public.listar_grados();

create or replace function public.listar_grados(p_nivel_id smallint default null)
returns table(id smallint, nombre text, nivel_id smallint, numero smallint)
language sql
security definer
as $$
  select id, nombre, nivel_id, numero
  from public.cat_grado
  where p_nivel_id is null or nivel_id = p_nivel_id
  order by nivel_id, numero;
$$;

grant execute on function public.listar_grados(smallint) to anon, authenticated;

create or replace function public.listar_turnos()
returns table(id smallint, nombre text)
language sql
security definer
as $$
  select id, nombre from public.cat_turno order by id;
$$;

grant execute on function public.listar_turnos() to anon, authenticated;

create or replace function public.listar_niveles()
returns table(id smallint, nombre text)
language sql
security definer
as $$
  select id, nombre from public.cat_nivel_educativo order by id;
$$;

grant execute on function public.listar_niveles() to anon, authenticated;

create or replace function public.listar_sostenimientos()
returns table(id smallint, nombre text)
language sql
security definer
as $$
  select id, nombre from public.cat_sostenimiento order by id;
$$;

grant execute on function public.listar_sostenimientos() to anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. buscar_alumno (presentación): mismo cuerpo que tenía, salvo el turno
--    que pasa de JOIN a LEFT JOIN para que un alumno guardado sin turno
--    también tenga página de presentación. El tutor se lee por la tabla
--    puente alumno_tutor (registrar_alumno ya crea ese enlace).
-- --------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------
-- 6. Comprobación rápida (después de Run, estas consultas deben contestar)
-- --------------------------------------------------------------------------
-- select * from public.listar_escuelas();
-- select * from public.listar_ciclos();
-- select * from public.listar_grados();
-- select * from public.listar_turnos();
-- select * from public.listar_niveles();
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'inscripcion'
--  order by ordinal_position;
--
-- NOTA: si la presentación no muestra el grado, el turno o al tutor de un
-- alumno capturado con este formulario, hay que revisar la función
-- buscar_alumno para que lea inscripcion.grado, inscripcion.turno y
-- tutor.alumno_id, porque esas columnas no existían antes.
-- ---------------------------------------------------------------------------
