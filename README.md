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

Run `npm run lint` and `npm run build` in `frontend`. Lint currently includes existing non-blocking warnings.

Run `npm test` in `backend`. The tests exercise the API (authentication, role access, validation, imports) against a scripted fake database, so they need no MySQL server; they do not prove the SQL itself, so the schema and queries must also be checked on a real MySQL server.

`npm run test:mysql` in `backend` does that against a disposable MySQL 8 server: it drops and recreates the throwaway databases `sms_it_fresh` and `sms_it_upgrade`, runs the main flows through the API, and checks that `backend/upgrades/` turns the previous schema into the current one. Never point it at a server holding real data.

```
MYSQL_TEST_HOST=127.0.0.1 MYSQL_TEST_PORT=3307 MYSQL_TEST_USER=root MYSQL_TEST_PASSWORD= npm run test:mysql
```

## Timetable generator and reminders

Super admins and admins get **Timetable Generator** in the menu. Work through its tabs in order:

1. **Calendar**: add the term (mark it current), its exam periods with alert days (e.g. `14,7,1`), and the bell schedule of lessons and breaks.
2. **Classes & streams**: create streams such as Gold and Diamond and give each class its stream.
3. **Subjects & teachers**: mark heavy subjects; give each teacher a skill level per subject (1 can teach, 2 good, 3 specialist) and weekly/daily period limits.
4. **Allocations**: per class, the subjects and periods a week for the term; optionally fix a teacher. Copy one class's subjects to its sister streams.
5. **Generate**: builds a clash-free draft (no class, teacher or room double-booked; teacher limits respected; heavy subjects kept to the morning; subjects spread over the week), with a report of anything that could not be placed and why. **Publish** replaces the live timetable for the allocated classes only.
6. **Reminders**: preview or send today's reminders.

Every school day at 07:00 (server time; set `TZ`, change with `REMINDER_TIME`) each student is notified of their class's lessons and each lecturer of their own; exam periods are announced on their alert days. Each reminder is sent once, even across restarts. `REMINDER_EMAILS=true` also emails them; `ENABLE_SCHEDULED_JOBS=false` turns the schedule off.

To try it with demo data: `npm run seed:scheduler-demo` in `backend` (fills only empty setup, never publishes; refuses to run in production). Existing databases need `backend/upgrades/003-timetable-generator.sql`.

## Repository structure

- `frontend/src/`: application screens, layout, shared styles and API client
- `backend/src/`: API modules, middleware, database and email configuration
- `backend/schema.sql`: initial database schema
- `backend/seed.js`: initial administrator
- `backend/public/uploads/`: runtime uploads; local files stay out of Git

## Version control

Commit application source, package manifests and the backend/frontend lockfiles. Environment secrets, dependencies, build output, editor settings and uploaded user files are ignored. Legacy migration scripts have been removed. Databases created from an earlier `schema.sql` need the additive scripts in `backend/upgrades/` (run each once, in order, after a backup); new installations already include them. Obsolete bulk styling scripts and unused starter assets have been removed.

## Account security

Accounts created by an administrator or a CSV import get a temporary password and must choose their own (12+ characters) before using anything else. Deactivating, deleting or changing the role of an account takes effect on its next request. Failed logins, registrations and gate check-ins are rate limited per address or lecturer. Set `ALLOW_PUBLIC_REGISTRATION=false` to remove self-service student sign-up.


Public registration only creates student accounts. Administrators can view the system-user list; only super administrators can change roles, account status or delete accounts. Keep `.env` private. The initial bootstrap credentials and JWT secret must be configured before deployment.
