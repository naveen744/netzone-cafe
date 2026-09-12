# NetZone Phase 3 — Cloud Database & Storage

## Architecture

Browser
  -> Node/Express API
      -> Supabase Postgres (`print_orders`)
      -> Supabase Storage (`print-orders` private bucket)

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase_schema.sql`.
4. In **Storage**, create a PRIVATE bucket called `print-orders`.
5. Copy the Project URL and service-role key into environment variables.
6. Never put the service-role key in `index.html`, `script.js`, GitHub, or any browser code.

## Local run

1. Install Node.js LTS.
2. Run `npm install`.
3. Set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET=print-orders`
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Production notes

- The print-order API uploads the document to private Supabase Storage first.
- It then creates the order record in Postgres.
- If database insertion fails, the uploaded file is removed as a best-effort rollback.
- Orders start with `pending` status.
- Phase 4 can add an admin dashboard and secure signed download links.

## Still to configure

Replace placeholder contact/location information in `public/index.html`.

## Security

This MVP validates file extensions and limits uploads to 10 MB. Before public launch, add:
- rate limiting / abuse protection
- stronger MIME/content validation
- CAPTCHA or equivalent protection
- admin authentication
- signed URLs for document access
- retention/deletion policy for customer documents


## Phase 4 — Admin dashboard

Open `/admin.html` after the server is running.

Set `NETZONE_ADMIN_TOKEN` to a long random secret in the server environment. The dashboard sends it as a Bearer token and does not store it in the database.

Admin capabilities:
- View latest orders
- Filter by status
- See order summary counts
- Change order status
- Open a document using a short-lived signed URL

Production hardening still recommended:
- Put the admin behind HTTPS.
- Use a proper authentication provider for multiple staff users.
- Add rate limiting and audit logging.
- Add automatic document retention/deletion.


## Google Maps location

The NetZone website now includes the supplied Google Maps location link and a map section.
The supplied Maps short link resolves to the Pipri/Naveen-Pappu map point at approximately:
25.4573078, 84.1175012.

Before launch, verify that this is the exact physical location where the cafe should appear and, if necessary, replace the map URL/coordinates with the final NetZone Google Business Profile location.


## Phase 5 — WhatsApp + customer status

The website now supports:
- Click-to-WhatsApp links for customer communication.
- A WhatsApp follow-up link after a print order is submitted.
- Public order-status lookup using only the order reference.
- No customer name, phone number, or document is exposed by the public status endpoint.

### WhatsApp number
Replace `91XXXXXXXXXX` in `public/index.html` and `public/script.js` with the NetZone WhatsApp number.

### Automated WhatsApp messages
True automated outbound WhatsApp notifications (for example, automatically sending “Your order is ready”) require a WhatsApp Business Platform provider/API and appropriate business setup. This MVP deliberately uses click-to-WhatsApp instead of storing third-party API credentials in the frontend.

For a production implementation, the recommended pattern is:
Customer/Staff action -> server/Edge Function -> WhatsApp provider API -> customer message.

Supabase Edge Functions are suitable for third-party integrations and webhooks and keep secrets server-side.


## Configured contact
NetZone WhatsApp and phone number: +91 96319 68965
