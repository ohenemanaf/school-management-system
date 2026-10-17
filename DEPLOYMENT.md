# Deployment and submission

This is a source package for a **fresh installation** using Docker Compose. One application serves the website, API and uploaded files. MySQL and uploads use persistent volumes. A bootstrap service creates the first super administrator after the schema is ready. No manual migration script is required for a new database.

## Quick start

Install Docker Engine + Compose on Linux, or Docker Desktop using Linux containers on Windows/macOS. Node.js 22.12+ is needed only for the configuration script; application dependencies build inside Docker.

From the extracted project folder:

1. Run `node scripts/configure-deployment.cjs --email YOUR_REAL_ADMIN_EMAIL` (replace the last argument).
2. Run `docker compose up -d --build`.
3. Use `docker compose ps` to confirm the app becomes healthy, then open http://localhost:8080. Read the generated `ADMIN_PASSWORD` from the private root `.env` and sign in using your email. Keep this file private.

The configuration script generates random database passwords, an administrator password and a token secret. It refuses to overwrite existing settings. Restarting the bootstrap service never resets or promotes an existing account.

For status use `docker compose ps`. For troubleshooting use `docker compose logs --tail=100 app bootstrap db`; redact secrets and personal data before sharing logs. Email is disabled until SMTP settings are supplied.

## Public deployment with HTTPS

Use a Linux server with Docker Compose. Point your domain's DNS to the server, allow inbound TCP 80/443 (and optionally UDP 443), then:

1. Complete configuration as above and set `SITE_DOMAIN` in the private root `.env` to your hostname, such as `school.your-domain.com` (no protocol or path).
2. Run `docker compose -f compose.yaml -f compose.https.yaml up -d --build`.
3. Open `https://YOUR_DOMAIN`.

The included Caddy proxy requests and renews certificates. MySQL has no public port. The application's HTTP port remains bound to loopback; leave `APP_BIND=127.0.0.1`. If you already have a hosting platform or reverse proxy, route HTTPS to the app's port instead and follow that provider's persistent-storage setup.

## Storage and existing systems

`database` stores MySQL data and `uploads` stores profile images and library PDFs. Named volumes survive ordinary container recreation and `docker compose down`. Do not use `down -v` on a system whose data you need.

The schema runs only when the MySQL volume is empty. This package does not import your current local database or uploaded files. To preserve existing school records, back them up and plan a separate import before switching systems. Historical database migrations remain in the development repository and are not included in the fresh-install submission archive.

Keep private `.env` settings with your backup. Database and upload backups must be stored off the server and restored on a disposable environment to verify them. Stop writes during coordinated backups; database and file backups must represent the same point in time. Avoid changing database passwords in `.env` after initial setup without rotating the corresponding MySQL accounts too.

## Updating

Back up first. Replace source with the reviewed version and run the same Compose startup command. Existing databases are not automatically migrated; review release-specific schema changes before an update.

## Verification

Frontend build/lint and backend syntax passed during preparation. Local production-server smoke checks passed for the login page, client-side routes, API liveness, unknown API routes and missing uploads. Readiness correctly returned 503 when pointed at an unreachable test database; no real database was accessed. The container health check verifies a database query through `/api/ready`. Docker is unavailable on the preparation machine, so the full container build, schema import, first-login and upload persistence still need to be verified on a Docker-enabled machine before public use. This package is deployment scaffolding, not a certification that all application security has been audited.

## What to submit

Submit the deployment ZIP or source repository, including this guide, Dockerfile, Compose files, source, schema, environment examples and lockfiles. Do not include real `.env` files, database dumps, uploaded student files, dependencies or generated passwords.

References: [Compose startup dependencies](https://docs.docker.com/compose/how-tos/startup-order/), [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/), [Caddy HTTPS](https://caddyserver.com/docs/automatic-https).
