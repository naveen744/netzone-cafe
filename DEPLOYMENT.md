# NetZone Phase 6 — Production Security + Deployment

## Recommended first deployment

For the first live version, deploy the entire Node/Express application as one Render Web Service.
This avoids splitting the frontend and API across different origins.

Render supports Node/Express web services and provides a free compute option for testing/hobby use. Free services spin down after inactivity and their local filesystem is ephemeral, so customer files/orders must remain in Supabase. See Render's current documentation before using this for business-critical production.

## 1. Supabase

Create a Supabase project.

Run:
- `supabase_production.sql`

Create a PRIVATE Storage bucket:
- `print-orders`

Copy:
- Project URL
- server-side service/secret key

Never put the server-side key in browser JavaScript or GitHub.

## 2. Render

Create a new Web Service from the GitHub repository.

Build command:
`npm install`

Start command:
`npm start`

Health check:
`/api/health`

Environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=print-orders`
- `NETZONE_ADMIN_TOKEN=<long random secret>`

Render's environment-variable/secrets interface should be used for these values.

## 3. Test after deployment

Open:
`https://YOUR-SERVICE.onrender.com/api/health`

Expected:
`{"ok":true,"service":"NetZone","storage":"supabase","admin":true}`

Then test:
- Home page
- Call button
- WhatsApp button
- Google Maps button
- Print-order submission
- File upload
- Order status lookup
- `/admin.html`
- Admin status change
- Secure document link

## 4. Production security implemented in Phase 6

- Helmet security headers
- Express `x-powered-by` disabled
- JSON body size limit
- Rate limiting on order submission
- Rate limiting on public status lookup
- 10 MB document upload limit
- Allowed document extensions
- Private Supabase Storage
- Server-only Supabase secret key
- Supabase RLS enabled on orders
- Short-lived signed document URLs
- Admin token authentication

## 5. Important limitations before real business launch

This is a strong MVP, not a complete enterprise security system.

Before processing significant customer volume:
- Replace single admin token with Supabase Auth + staff accounts.
- Add CAPTCHA/bot protection.
- Add stronger file-content validation/antivirus scanning.
- Add document retention/deletion automation.
- Add audit logging for admin actions.
- Add backups appropriate for business needs.
- Add a privacy notice explaining document handling.
- Verify the exact Google Maps location and business listing.

## 6. Cost expectation

You can start without an Emergent/Bolt publishing subscription.

The current architecture can use:
- Render Free for initial testing/hobby hosting
- Supabase Free for initial low-volume testing
- Google Maps link supplied by the owner

Free tiers have limitations. Supabase currently lists 500 MB database, 1 GB file storage and project pausing after 1 week of inactivity on its Free plan. Render's Free web services spin down after 15 minutes of inactivity and have ephemeral local storage. Therefore, Supabase remains the persistent data/document layer.

For a real café with regular customers, review the current limits and consider paid plans when usage or reliability requires it.
