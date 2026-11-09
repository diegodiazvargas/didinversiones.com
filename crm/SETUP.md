# DIDI CRM — puesta en marcha

El CRM vive en `/crm` dentro del mismo sitio y usa [Supabase](https://supabase.com) (plan gratis) como base de datos + login. Sigue estos pasos una sola vez.

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea una cuenta / inicia sesión.
2. **New project** → nómbralo `didi-crm`, elige una contraseña de base de datos (guárdala) y la región más cercana (ej. `South America (São Paulo)`).
3. Espera ~2 minutos a que se aprovisione.

## 2. Crear las tablas

1. En el panel izquierdo, abre **SQL Editor** → **New query**.
2. Copia y pega todo el contenido de [`crm/schema.sql`](schema.sql) y presiona **Run**.
3. Verifica en **Table Editor** que aparecen `profiles`, `leads` y `lead_activities`.

## 3. Conectar el CRM a tu proyecto

1. En Supabase: **Settings → API**.
2. Copia **Project URL** y la llave **anon public**.
3. Abre [`crm/js/supabase-config.js`](js/supabase-config.js) y reemplaza:
   ```js
   const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
   const SUPABASE_ANON_KEY = "TU-ANON-PUBLIC-KEY";
   ```
4. Guarda y sube el cambio (commit + push) para que Netlify lo despliegue.

> La "anon public key" está diseñada para usarse en el navegador — no es secreta. La seguridad real la da Row Level Security (ya configurado en `schema.sql`): solo usuarios autenticados pueden ver/editar leads.

## 4. Crear usuarios (vendedores)

1. En Supabase: **Authentication → Users → Add user**.
2. Crea un usuario por cada vendedor con su correo y una contraseña temporal (pídeles que la cambien después, o usa "Send magic link" si prefieres sin contraseña).
3. La primera vez que cada vendedor entre a `/crm`, el sistema le pedirá su nombre y creará su perfil automáticamente con rol `vendedor`.
4. Para darte a ti (u otro admin) permisos de **administrador** (necesarios para poder eliminar leads): en **Table Editor → profiles**, busca tu fila y cambia la columna `role` de `vendedor` a `admin`.

## 5. Acceder al CRM

- Login: `https://didinversiones.com/crm/` (o `/crm/index.html`)
- Pipeline: se abre automáticamente después de iniciar sesión.

## Notas

- Las 7 etapas (Lead → Reunión agendada → Reserva → Aprobación → Promesa → Escritura → Arriendo) son fijas en el código (`crm/js/supabase-config.js`, constante `STAGES`). Si quieres cambiar nombres o agregar una etapa, edítala ahí y también el `check` de la columna `stage` en `schema.sql` (ejecutando un `alter table` si ya tienes datos).
- Todos los vendedores ven y pueden mover todos los leads (pipeline compartido, como en Kommo/HubSpot). Si más adelante quieres que cada vendedor solo vea sus propios leads, se ajusta la política RLS `leads_select_all` en Supabase.
- El filtro por vendedor y el buscador (arriba del tablero) funcionan sobre lo cargado; con pocos cientos de leads no hay problema de rendimiento.
