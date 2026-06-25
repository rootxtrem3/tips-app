# power tips

Privacy-respecting news platform with:

- `backend/`: FastAPI + PostgreSQL REST API
- `android-client/`: public Android news reader
- `android-admin/`: authenticated Android admin app
- `docs/`: API and architecture notes

The system is original and self-hosted. It does not depend on any reverse-engineered API, ad SDK, or analytics service.

## Structure

- `backend/`: FastAPI service with JWT auth, PostgreSQL schema, uploads, and article/category APIs
- `android-client/`: `com.yourname.powertips` public reader app
- `android-admin/`: `com.yourname.powertips.admin` admin app
- `docs/api-spec.md`: request and response contracts
- `docs/architecture.md`: architecture, data flow, security, and performance notes

## Simple Server Setup

For a non-technical admin, use the top-level scripts:

1. Install Docker.
2. Run `./start-power-tips.sh`
3. The first run creates `.env` and stops so the password can be changed.
4. Open `.env`, set:
   - `JWT_SECRET_KEY`
   - `ADMIN_BOOTSTRAP_PASSWORD`
5. Run `./start-power-tips.sh` again

Useful commands:

- Start: `./start-power-tips.sh`
- Stop: `./stop-power-tips.sh`
- Change admin password in `.env`: `./reset-admin-password.sh "new-password"`

The backend will:

- start PostgreSQL automatically
- start the API automatically
- create the admin user automatically if it does not exist yet
- keep uploaded images in Docker-managed storage

Android apps point at `BuildConfig.API_BASE_URL` and should be updated to your backend URL.

## Connecting The System

1. Start the server with `./start-power-tips.sh`.
2. Set `BuildConfig.API_BASE_URL` in:
   - `android-client/app/build.gradle.kts`
   - `android-admin/app/build.gradle.kts`
3. For Android Emulator against a local backend, use `http://10.0.2.2:8000/api/v1/`
4. For a real device, use your machine's LAN IP or deployed HTTPS domain.
5. Admin app creates or edits articles through the backend.
6. Client app reads the same backend and shows notifications for newly published articles.

## Notification Model

Notifications are backend-controlled but client-delivered:

- Admin publishes article to your backend.
- Client app polls the latest published article in the background with WorkManager.
- If a newer article exists, the app posts a local Android notification.

This avoids Firebase, OneSignal, and third-party tracking infrastructure.
