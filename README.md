# IndieHub

IndieHub is a full-stack music discovery platform for independent artists and listeners.

## Phase 2: authentication

Phase 2 includes:

- MySQL-backed listener and artist registration
- Bcrypt password hashing
- JWT login and session verification
- Role claims for listener, artist, and admin authorization
- Protected frontend routes
- Login and registration screens

Admin accounts are intentionally not available through public registration.

## Run locally

1. Start MySQL and create the schema:

   ```powershell
   mysql -u root -p < database\schema.sql
   ```

2. Copy `.env.example` to `.env` in the repository root and set the real MySQL values:

   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=indiehub
   JWT_SECRET=use_a_long_random_secret
   PORT=5000
   CLIENT_URL=http://localhost:5173
   ```

3. Start the API:

   ```powershell
   cd server
   npm run dev
   ```

4. Start the frontend in another terminal:

   ```powershell
   cd client
   npm run dev
   ```

The API exposes `GET /api/health` to verify the MySQL connection. Authentication endpoints are:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

Use a bearer token from login for `/api/auth/me`:

```text
Authorization: Bearer <token>
```
