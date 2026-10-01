# Presentación institucional – Supabase + GitHub Pages

## URL de consulta

```
https://netioscr-arch.github.io/sch00l_modinfo/?cct=TU_CCT&a=NUMERO_ALUMNO
```

Ejemplo:
```
https://netioscr-arch.github.io/sch00l_modinfo/?cct=28PJN9999X&a=12345
```

## Cómo funciona

1. La página lee `cct` y `a` de la URL.
2. Llama a la función RPC de Supabase: `buscar_alumno(p_cct, p_numero_alumno)`.
3. Rellena nombre, escuela, grado, grupo, turno, teléfono y correo del tutor.

## Configuración en Supabase (importante)

Para que funcione desde el navegador (rol `anon` / publishable):

1. En **SQL Editor** ejecuta (ajusta el nombre si tu función se llama distinto):

```sql
GRANT EXECUTE ON FUNCTION public.buscar_alumno(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.buscar_alumno(text, text) TO authenticated;
```

2. Si usas RLS en las tablas subyacentes, la función debe estar definida con
   `SECURITY DEFINER` y un `search_path` seguro, o las políticas deben permitir
   la lectura necesaria.

3. Prueba la función en el SQL Editor:

```sql
SELECT * FROM buscar_alumno('28PJN9999X', '12345');
```

## Estructura

```
presentacion/
├── index.html
├── css/styles.css
├── js/main.js          ← URL, key y lógica Supabase
├── sections/           ← Fragmentos HTML
└── README.md
```

## Subir a GitHub

Copia el contenido de esta carpeta a la raíz (o a la carpeta que use GitHub Pages)
del repositorio `sch00l_modinfo` y haz push.

## Seguridad

- Solo se usa la **publishable / anon key** (correcto en frontend).
- Nunca subas la `service_role` key.
- Recomendado: que `buscar_alumno` sea la única vía de lectura pública.
