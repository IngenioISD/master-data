# Datos Maestros — Plan de construcción

App interna de Ingenio para gestionar Propiedad, Proyectos y Proveedores, conectada al Supabase compartido `odzmnfuatigntblqutvf` (Frankfurt). Mismo sistema de login que el resto de apps de Ingenio.

## 0. Antes de empezar necesito

Como vamos a **conectar a un Supabase externo ya existente** (no a Lovable Cloud), necesito que me proporciones:

1. **`SUPABASE_PUBLISHABLE_KEY`** (anon key) del proyecto `odzmnfuatigntblqutvf`. Es pública, pero no la tengo desde aquí.
2. Confirmar que las tablas relevantes (`usuarios_cliente`, `cliente_roles`, `clientes_propiedades`, `propiedad`, `propiedad_contactos`, `proyectos`, `proyecto_proveedores`, `cliente_proveedores`, `proveedor_subcontrata`, `proveedor_contactos`, `catalogo`) tienen ya RLS y políticas que filtran por `empresa_id` / `cliente_id` derivado del JWT (igual que en Albaranes/Actas). Si es así, no creo migraciones; solo consumo.
3. ¿Subo el archivo `ingenio-design-system.css` / `ingenio-tokens-v2.json` o lo replico desde los valores que ya me has dado (navy, lima, fondo, etc.)? Si tienes el CSS, mejor pégalo o súbelo.

Con esos tres puntos resueltos, ejecuto todo lo siguiente sin más preguntas.

## 1. Stack y bootstrap

- Mantengo TanStack Start + Tailwind v4 + shadcn/ui + Lucide ya scaffoldeados.
- Cliente Supabase manual en `src/integrations/supabase/client.ts` apuntando a `https://odzmnfuatigntblqutvf.supabase.co` con la anon key vía `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **No** uso `supabase--enable` de Lovable (eso crearía un proyecto nuevo). **No** uso `requireSupabaseAuth` ni server functions con bearer — toda la lectura/escritura va por el cliente Supabase del navegador con RLS, igual que las otras apps de Ingenio.
- Inter desde Google Fonts vía `<link>` en `__root.tsx`.

## 2. Design system Ingenio

`src/styles.css` con tokens fijos:

```text
--background: #F4F6F9   --surface: #FFFFFF
--foreground: #1A2035   --border: #E0E4ED
--primary:   #001E38   (navy, sidebar + botón primario)
--accent:    #B3FF00   (lima, estado activo)
font-sans: "Inter", Arial, sans-serif
```

Mapeados en `@theme inline` a los tokens de shadcn (background, foreground, primary, accent, border, sidebar, sidebar-primary, sidebar-accent...). Sin modo oscuro.

## 3. Autenticación y control de acceso

- `/auth` (pública): email + password → `supabase.auth.signInWithPassword`. Estética Ingenio (card centrada, logo wordmark, navy + lima).
- Layout `_authenticated/route.tsx` (`ssr: false`): comprueba sesión; si no, redirige a `/auth`.
- Layout `_authenticated/_app/route.tsx`: consulta `cliente_roles` por `rol_id` del JWT y verifica `puede_gestionar_datos_maestros = true`. Si no → pantalla "No tienes acceso a Datos Maestros" (sin sidebar, sin nada más, solo botón "Cerrar sesión"). Si sí → renderiza sidebar + `<Outlet />`.
- Hook `useAuth()` expone `user`, `claims` (empresa_id, rol_id, cliente_id, portal), `signOut`. Cache con React Query.

## 4. Layout principal

- `Sidebar` shadcn collapsible, navy, con tres entradas en este orden: **Propiedad**, **Proyectos**, **Proveedores**. Activo con fondo lima y texto navy.
- Header simple: trigger del sidebar, nombre del usuario, botón "Cerrar sesión".

## 5. Propiedad — `/propiedad`

- **Listado**: `propiedad` JOIN `clientes_propiedades` filtrado por `cliente_id` del JWT. Buscador por `nombre_legal` / `nombre_comercial` / `nif`. Columnas: nombre comercial, NIF, municipio, activo, acciones.
- **Alta** (diálogo de 2 pasos):
  1. Input NIF → busca en `propiedad` global. Si existe → muestra ficha y botón "Vincular a mi cliente" (INSERT en `clientes_propiedades`, `activo=true`).
  2. Si no existe → formulario: `nif`, `nombre_legal`, `nombre_comercial` (placeholder = nombre_legal, copia si vacío). Sección "Dirección fiscal" colapsable y opcional: vía, número, CP, municipio, provincia, país. INSERT en `propiedad` + INSERT en `clientes_propiedades`.
- **Detalle** `/propiedad/$id`: datos fiscales editables + sección **Contactos** (`propiedad_contactos`): tabla con add/edit/delete inline. Campos: nombre, apellidos, departamento (select: Administración, Ventas, Dirección, Operaciones, Otro), teléfono, email. Validación con zod.
- Toggle "activo" en `clientes_propiedades` desde el listado.

## 6. Proyectos — `/proyectos`

- **Listado**: `proyectos` filtrado por `cliente_id`. Filtro de estado (chips: En estudio / Adjudicado / Perdido / Finalizado) + buscador por nombre/código.
- **Alta**: diálogo con `nombre`, `propiedad_id` (combobox "buscar o crear" reutilizando el flujo de Propiedad), `tipo_obra` (select cargado de `catalogo` WHERE `categoria='tipo_obra'`). Crea con `estado='En estudio'`.
- **Detalle** `/proyectos/$id`:
  - Campos generales editables (nombre, propiedad, tipo_obra).
  - Selector de estado. Al intentar pasar a "Adjudicado" abre un diálogo que exige y valida: `codigo`, dirección completa (vía, número, CP, municipio, provincia, país), `fecha_adjudicacion`, `duracion_prevista_meses`. Sin esos campos, el cambio se bloquea.
  - Sección **Proveedores asignados** (`proyecto_proveedores`): disponible desde "En estudio". Combobox "buscar o crear proveedor" (reusa flujo de Proveedores). Lista con toggle activo + eliminar.
- Estados "Perdido" y "Finalizado" sin requisitos extra más allá del estado actual.

## 7. Proveedores — `/proveedores`

- **Listado**: `proveedor_subcontrata` JOIN `cliente_proveedores` filtrado por `cliente_id`. Buscador por nombre/NIF + filtro `tipo_proveedor` (Material/Servicios/Mixto).
- **Alta**: mismo patrón de 2 pasos que Propiedad. Si el NIF existe → solo vincula (`cliente_proveedores`). Si no → formulario: `nif`, `nombre_legal`, `tipo_proveedor` obligatorios; dirección fiscal opcional. INSERT en `proveedor_subcontrata` + `cliente_proveedores`.
- **Detalle** `/proveedores/$id`: datos editables + **Contactos** (`proveedor_contactos`) con el mismo componente reutilizable de contactos.
- Toggle activo en `cliente_proveedores`.

## 8. Componentes transversales

- `BuscarOCrearCombobox<T>` reutilizable (propiedad y proveedor): debounce, búsqueda por NIF/nombre, item "Crear nuevo…" que abre el formulario de alta correspondiente.
- `ContactosManager` reutilizable parametrizado por tabla (`propiedad_contactos` / `proveedor_contactos`) y FK.
- `DireccionFiscalFields` reutilizable (vía, número, CP, municipio, provincia, país).
- `EstadoProyectoBadge` y `TipoProveedorBadge` con colores Ingenio.
- Toasts con sonner para feedback de creación/edición/error.

## 9. Lo que NO toco

- Tabla `clientes` ni configuración de cliente.
- Auth Hook de Supabase (ya configurado para inyectar claims).
- Esquema de base de datos (asumo que ya existe en el Supabase compartido).
- Sin migraciones, sin edge functions, sin server functions con service role.

## Detalles técnicos

- React Query para todas las lecturas; `invalidateQueries` por clave después de mutaciones (`['propiedad']`, `['proyecto', id]`, etc.).
- Tipos de Supabase: si me pasas `src/integrations/supabase/types.ts` generado, lo uso; si no, defino interfaces locales mínimas para las tablas que consumo y dejo nota para regenerar.
- Validación con zod en todos los formularios (NIF español, email, teléfono, longitudes razonables).
- Rutas TanStack: `/auth`, `/_authenticated/_app/propiedad`, `/_authenticated/_app/propiedad/$id`, idem proyectos y proveedores.
- `sitemap.xml` no procede (app interna autenticada); `robots.txt` con `Disallow: /`.

¿Me confirmas la anon key, el estado de RLS y si me pasas el CSS de tokens, y arranco?
