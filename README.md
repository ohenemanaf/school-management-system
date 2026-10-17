# School Management System

A role-based school administration app built with React, Vite and Tailwind CSS, backed by Express and MySQL. Includes student and lecturer management, programs, courses, groups, rooms, timetables, attendance, grades, materials, finance, library and notifications.

## Simple deployment

For a submission package and fresh installation, follow [DEPLOYMENT.md](DEPLOYMENT.md). Docker Compose builds the app, initializes MySQL, creates the first super administrator and preserves uploaded files.

## Requirements

- Node.js 22.12 or newer (a supported LTS release is recommended)
- MySQL 8 or newer
- Two terminals for the backend and frontend

## Local setup

1. In `backend`, run `npm ci`, copy `.env.example` to `.env`, and fill in your database credentials and a unique random `JWT_SECRET` of at least 32 characters. The backend refuses missing, short or placeholder token secrets. Generate one locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
2. Create the database named in `DB_NAME` (default: `school_system`). Import `backend/schema.sql` into that database with your MySQL client. The schema is for new installations; do not use it as a substitute for upgrading an existing database.
3. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` (at least 12 characters, at most 72 UTF-8 bytes) in `backend/.env`, then run `npm run seed` in `backend` to create the initial super administrator. This inserts the account only if the email does not already exist; it does not promote or reset an existing account. No default password is provided.
4. Run `npm run dev` in `backend` (default: http://localhost:5000). The health endpoint is `/api/health`.
5. In `frontend`, run `npm ci`, copy `.env.example` to `.env`, and run `npm run dev`. Open the local URL printed by Vite (normally http://localhost:5173).

The frontend reads `VITE_API_URL`, defaulting to `/api`. Vite proxies local API and upload requests to port 5000; the deployed app serves both from the same origin. SMTP configuration is optional for local development; the existing backend attempts to create an Ethereal test mail account if SMTP is unset.

## Checks

Run `npm run lint` and `npm run build` in `frontend`. Lint currently includes existing non-blocking warnings. The backend does not currently have an automated regression test suite; `npm test` is an explicit failing placeholder. Backend source is checked for JavaScript syntax. The initial schema must be verified on a disposable database before a new deployment.

## Repository structure

- `frontend/src/`: application screens, layout, shared styles and API client
- `backend/src/`: API modules, middleware, database and email configuration
- `backend/schema.sql`: initial database schema
- `backend/seed.js`: initial administrator
- `backend/migrate*.js`: historical database migrations; review against your database before using an individual script
- `backend/public/uploads/`: runtime uploads; local files stay out of Git

## Version control

Commit application source, package manifests and the backend/frontend lockfiles. Environment secrets, dependencies, build output, editor settings and uploaded user files are ignored. Historical migrations are retained for existing installations. Obsolete bulk styling scripts and unused starter assets have been removed.

## Account security

Public registration only creates student accounts. Administrators can view the system-user list; only super administrators can change roles, account status or delete accounts. Keep `.env` private. The initial bootstrap credentials and JWT secret must be configured before deployment.
