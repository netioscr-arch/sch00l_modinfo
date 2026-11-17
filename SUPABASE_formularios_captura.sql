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
-- --------------------------------------------------------------------------
create or replace function public.listar_escuelas()
returns table(id uuid, nombre text, cct text)
language sql
security definer
stable
as $$
  select id, nombre, cct
  from public.escuela
  order by nombre;
$$;

grant execute on function public.listar_escuelas() to anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Registrar escuela
--    Devuelve el id de la escuela creada.
--    La CCT no se puede repetir: si ya existe, marca error.
-- --------------------------------------------------------------------------
create or replace function public.registrar_escuela(
  p_nombre text,
  p_cct text,
  p_eslogan text default null,
  p_correo text default null,
  p_municipio text default null,
  p_sector text default null,
  p_zona_escolar text default null,
  p_calle text default null,
  p_colonia text default null,
  p_codigo_postal text default null,
  p_estado text default null,
  p_logo_url text default null
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
  if exists (select 1 from public.escuela where cct = btrim(p_cct)) then
    raise exception 'Ya existe una escuela con la CCT %', btrim(p_cct);
  end if;

  insert into public.escuela
    (nombre, cct, eslogan, correo, municipio, sector, zona_escolar,
     calle, colonia, codigo_postal, estado, logo_url)
  values
    (btrim(p_nombre), btrim(p_cct),
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
  text, text, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Registrar alumno
--    Guarda el alumno, su inscripción (grupo, grado, turno) y su tutor,
--    genera el token_publico y lo devuelve junto con el id.
--    El enlace de presentación se arma así:
--      https://sch00l-modinfo.vercel.app/?t=<token_publico>
-- --------------------------------------------------------------------------
create or replace function public.registrar_alumno(
  p_escuela_id uuid,
  p_nombres text,
  p_apellido_paterno text,
  p_apellido_materno text default null,
  p_numero_alumno text default null,
  p_grupo text default null,
  p_grado text default null,
  p_turno text default null,
  p_tutor_nombres text default null,
  p_tutor_correo text default null,
  p_tutor_telefono text default null
)
returns table(alumno_id uuid, token_publico text)
language plpgsql
security definer
as $$
declare
  v_alumno_id uuid;
  v_token text;
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
  if p_grupo is null or btrim(p_grupo) = '' then
    raise exception 'El grupo es obligatorio';
  end if;

  -- Token público único (32 caracteres hexadecimales)
  loop
    v_token := encode(gen_random_bytes(16), 'hex');
    exit when not exists (select 1 from public.alumno where token_publico = v_token);
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
    (alumno_id, escuela_id, grupo, grado, turno)
  values
    (v_alumno_id, p_escuela_id,
     btrim(p_grupo),
     nullif(btrim(coalesce(p_grado, '')), ''),
     nullif(btrim(coalesce(p_turno, '')), ''));

  if p_tutor_nombres is not null and btrim(p_tutor_nombres) <> '' then
    insert into public.tutor
      (alumno_id, nombres, correo, telefono)
    values
      (v_alumno_id, btrim(p_tutor_nombres),
       nullif(btrim(coalesce(p_tutor_correo, '')), ''),
       nullif(btrim(coalesce(p_tutor_telefono, '')), ''));
  end if;

  return query select v_alumno_id, v_token;
end;
$$;

grant execute on function public.registrar_alumno(
  uuid, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. Comprobación rápida (después de Run, estas consultas deben contestar)
-- --------------------------------------------------------------------------
-- select * from public.listar_escuelas();
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'inscripcion'
--  order by ordinal_position;
--
-- NOTA: si la presentación no muestra el grado, el turno o al tutor de un
-- alumno capturado con este formulario, hay que revisar la función
-- buscar_alumno para que lea inscripcion.grado, inscripcion.turno y
-- tutor.alumno_id, porque esas columnas no existían antes.
-- ---------------------------------------------------------------------------
