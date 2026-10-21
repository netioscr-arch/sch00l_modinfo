# Presentación institucional – Supabase + GitHub Pages

## URL de consulta (token público)

```
https://netioscr-arch.github.io/sch00l_modinfo/?t=TOKEN_PUBLICO
```

Ejemplo:
```
https://netioscr-arch.github.io/sch00l_modinfo/?t=a3f91c82b0e74d1a9c2e5b67
```

El token está en `alumno.token_publico` (ver `SUPABASE_token_publico.sql`).

## Cómo funciona

1. La página lee `t` de la URL.
2. Llama a la RPC `buscar_alumno(p_token)`.
3. Rellena escuela, logo, eslogan, nombre, grado, grupo, turno y contacto del tutor.

## Configuración en Supabase

1. Ejecuta el archivo `SUPABASE_token_publico.sql` en el SQL Editor.
2. Comprueba:
```sql
SELECT token_publico FROM public.alumno LIMIT 5;
SELECT * FROM public.buscar_alumno('un_token_real');
```

## Seguridad

- El enlace ya no expone CCT ni número de alumno.
- Solo la función `buscar_alumno(text)` es ejecutable por `anon`.
- No subas la `service_role` key al frontend.

