# LedgerGuard frontend

The production frontend is a Vite static site. It can be hosted on Vercel,
Netlify, or another static host that supports an SPA fallback. The backend is
deployed separately and is configured through `VITE_API_URL`.

The frontend uses the existing LedgerGuard authentication API:

- `POST /api/auth/register` with `name`, `email`, and `password`
- `POST /api/auth/login` with `email` and `password`
- `POST /api/auth/logout`
- `GET /api/users/me` with a bearer token
- `POST /api/auth/google` with a Google Identity Services ID token

The API returns the JWT in the login and registration JSON response. The
frontend keeps that token in React memory and does not write it to
`localStorage`, cookies, or other persistent browser storage. A full page
refresh therefore returns to the sign-in screen; this matches the current
backend, which has no refresh-token endpoint or server-set authentication
cookie.

Confirmed completed transfers use a dedicated success modal with the backend
transaction reference, amount, status, and timestamp. The modal reuses the
existing Three.js ledger artwork and plays a short Web Audio confirmation only
once per completed transaction. The sound preference is stored locally under
the Settings page; pending, failed, and uncertain transfers never trigger the
success modal or sound.

## Local development

Start the backend on port 3000, then run:

```powershell
npm install
npm run dev
```

Vite proxies `/api` requests to `http://localhost:3000`. For another API
origin, set `VITE_API_URL` before starting Vite. For public local testing
through ngrok, use the backend HTTPS forwarding URL with `/api` appended and
set `VITE_ALLOWED_HOSTS` to the frontend ngrok hostname. Restart Vite after
changing either variable.

To enable Google sign-in locally, copy `.env.example` to `.env.local` and set
the Web Client ID. Set the same client ID as `GOOGLE_CLIENT_ID` in the
backend `.env`. The Google Cloud OAuth application must allow
`http://localhost:5173` as an authorized JavaScript origin.

Example frontend configuration:

```powershell
Copy-Item .env.example .env.local
```

Then set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env.local` and
`GOOGLE_CLIENT_ID` in the backend `.env` to the same Web Client ID. The client
ID is public configuration; never put a Google client secret in Vite variables.
The local override is ignored by Git. Never commit `.env.local` or any other
environment file containing credentials.

## Manual authentication verification

1. Open `http://localhost:5173`.
2. Register with a new email and a password of at least six characters.
3. Confirm the dashboard appears only after the API returns a successful user
   and token response.
4. Sign out from the sidebar profile control and confirm the sign-in screen
   returns.
5. Try the same email again and confirm the duplicate-registration error is
   shown.
6. Try an incorrect password and confirm the invalid-credentials error is
   shown.
7. Stop the backend and submit the form to confirm a network error is shown.
8. Refresh the page and confirm the user must sign in again, rather than using
   a persisted token.
9. Click **Continue with Google** and confirm the backend validates the ID token
   before creating or signing in the user.
10. For an existing email/password account, confirm Google sign-in shows a
    conflict instead of silently linking identities.

## Production deployment

### Vercel

From the repository root, create a Vercel project with `frontend` as the
project root. The checked-in [vercel.json](./vercel.json) builds `dist` and
rewrites client-side routes to `index.html`.

Set these Vercel environment variables for Production:

```text
VITE_API_URL=https://your-api.example.com/api
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
VITE_ALLOWED_HOSTS=
```

Only variables prefixed with `VITE_` are exposed to browser code. Never place
database URLs, JWT secrets, OAuth client secrets, refresh tokens, SMTP
passwords, or API keys in these variables.

### Production checklist

1. Deploy the API using the root [render.yaml](../render.yaml), or configure an
   equivalent Node.js service with:

   ```text
   Build: npm ci && npx prisma generate && npx prisma migrate deploy
   Start: node server.js
   Health check: /health
   ```

2. Set the API's `FRONTEND_URL` to the exact HTTPS frontend origin, without a
   trailing slash or path.
3. Set `VITE_API_URL` to the API HTTPS origin plus `/api`, without a trailing
   slash after `/api`.
4. Add the frontend HTTPS origin to the Google OAuth client's authorized
   JavaScript origins. Keep the same Web Client ID in `GOOGLE_CLIENT_ID` and
   `VITE_GOOGLE_CLIENT_ID`.
5. Set every backend secret in the hosting provider's secret manager. Do not
   commit `.env` or paste replacement credentials into source control.
6. Redeploy both services after changing environment variables.
7. Verify `https://your-api.example.com/health` before testing the frontend.

The API uses bearer JWTs held in frontend memory; it does not issue an
authentication cookie or refresh token. A full browser refresh therefore
returns to sign-in by design. CORS accepts only the exact `FRONTEND_URL` origin
and does not use wildcard origins. HTTPS is required for production API and
frontend URLs.

### Deployment verification

After deployment, verify with a non-production test account:

1. Open the deployed frontend and confirm no mixed-content or CORS errors.
2. Register or sign in and confirm the dashboard loads account data.
3. Select an account and verify authorized transfer history loads.
4. Use a disposable test account and idempotency key to exercise transfers.
5. Confirm an expired or invalid session returns to sign-in.
6. Confirm direct navigation to `/verify-email` and other client routes loads
   through the SPA fallback.

Do not use real customer information in screenshots. A deployment URL is only
considered verified after these checks pass against the live services.
