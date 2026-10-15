# Al-Dosari admin API

Express API for the reserve's admin dashboard and public news feed. MongoDB stores admin accounts and articles; Cloudinary stores article cover images.

## Run locally

1. Install the API dependencies: `cd server && npm install`.
2. Copy `.env.example` to `.env` and set MongoDB, JWT secrets, and Cloudinary credentials. `CLIENT_ORIGIN` accepts a comma-separated list of allowed frontend origins, for example `http://localhost:5173,https://aldosarizoo.net`. Keep only origins you actually use.
3. Create the first admin (there is no public admin registration endpoint; use a password of at least 10 characters): `npm run admin:create -- "Reserve Admin" admin@example.com "a-long-unique-password"`.
4. Start the API with `npm run dev`.
5. In `client`, run `npm run dev`. Open `/admin` and sign in with the admin credentials.

The Vite client uses `VITE_API_URL` when set, otherwise it calls `http://localhost:4000/api`. Set that variable to your deployed API URL for production. The public news page can consume `GET /api/articles`, which returns published articles only unless a valid admin access token is supplied.

## Endpoints

- `POST /api/auth/login` — admin email and password; returns an access token (15 minutes by default) and refresh token.
- `POST /api/auth/refresh` — exchange a refresh token for a new access and rotated refresh token.
- `POST /api/auth/logout`, `GET /api/auth/me` — authenticated admin session operations.
- `GET /api/admins`, `POST /api/admins` — authenticated admin directory and creation of additional admin accounts.
- `PUT /api/admins/me` — authenticated profile changes. A current password is required to set a new password; changing it rotates the current refresh session.
- `PUT /api/admins/:id` — update another admin's name and email.
- `GET /api/articles` — published articles publicly; admins can list drafts too. Supports `page`, `limit`, and admin `status` filters.
- `GET /api/articles/:id` — published article detail.
- `POST /api/articles`, `PUT /api/articles/:id`, `DELETE /api/articles/:id` — admin-only content management. Send fields as multipart form data; optional cover image field is `image` (JPEG, PNG, or WebP, 10 MB maximum).
- `GET /api/health` — service health.

Refresh tokens are stored hashed in MongoDB and rotated on each refresh. The refresh token itself is held in an HttpOnly cookie; access tokens stay in session storage and are sent in the Authorization header. Refresh and logout requests are origin-checked. Configure HTTPS in production and use unique random JWT secrets.
