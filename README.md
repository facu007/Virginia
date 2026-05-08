# Virginia Oficial

Sitio estatico con Supabase para catalogo, checkout mayorista y panel admin.

## Setup de Supabase

Ejecuta estos archivos en este orden:

1. `supabase-setup.sql`
2. `supabase-security.sql`
3. `supabase-improvements.sql`
4. `supabase-user-orders.sql`
5. `supabase-storage.sql`

## Configuracion opcional

Edita `site-config.js` si quieres activar:

- `gaMeasurementId`: Google Analytics 4
- `orderEmailWebhook`: webhook para enviar emails de confirmacion desde un backend o automatizacion externa

## PWA

El proyecto incluye:

- `manifest.json`
- `service-worker.js`
- iconos en `img/`
