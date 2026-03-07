# Local Setup (Windows) - USB API Client

This is the exact process used to get this project running locally on this machine.

## 1) Prerequisites

Install these first:
- Node.js 22+ (npm included)
- Docker Desktop (Windows)

Verify:

```powershell
node --version
docker --version
```

## 2) Install project dependencies

In this repo root:

```powershell
npm.cmd install
```

> Why `npm.cmd`?
> On this machine, PowerShell blocked `npm.ps1` due to execution policy, while `npm.cmd` worked reliably.

## 3) One-command local startup (recommended)

From repo root:

```powershell
npm.cmd run dev:local
```

What this does automatically:
- Ensures Docker is running
- Starts (or creates) the local Postgres container `usb-api-postgres`
- Waits for Postgres readiness
- Sets fallback local env values for runtime (`DATABASE_URL`, `SESSION_SECRET`) if not already provided
- Starts the app (`npm run dev`)

Then open:
- http://localhost:5000

## 4) Stop local DB container

```powershell
npm.cmd run stop:local
```

## 5) Restart local environment

```powershell
npm.cmd run restart:local
```

This runs stop + start flow for local development.

## 6) Database details used locally

Current local defaults used by helper scripts:
- Container name: `usb-api-postgres`
- Image: `postgres:16`
- DB user: `usbuser`
- DB password: `usbpass`
- DB name: `usb_api_client`
- Host port: `5433`

Connection string:

```text
postgresql://usbuser:usbpass@127.0.0.1:5433/usb_api_client
```

> Note: Port `5433` was chosen because `5432` was already used by another local Postgres service on this machine.

## 7) Apply DB schema manually (if needed)

If you need to re-push schema manually:

```powershell
$env:DATABASE_URL="postgresql://usbuser:usbpass@127.0.0.1:5433/usb_api_client"
npm.cmd run db:push
```

## 8) Helpful troubleshooting

### PowerShell blocks `npm` with "npm.ps1 is not digitally signed"
Use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev:local
```

### Docker is installed but daemon is not running
Start Docker Desktop, wait until it is running, then retry `npm.cmd run dev:local`.

### App says `DATABASE_URL must be set`
Use `dev:local`, or set env explicitly in your shell:

```powershell
$env:DATABASE_URL="postgresql://usbuser:usbpass@127.0.0.1:5433/usb_api_client"
```

### Port conflict on 5432
This setup already uses `5433`. If you change ports, update your `DATABASE_URL` (or set `PGPORT` before running `dev:local`).

### `ENOTSUP ... reusePort` on Windows
This repo has already been patched to avoid `reusePort` on Windows.

## 9) Scripts added for local workflow

- `dev:local` -> start local DB + app
- `stop:local` -> stop local DB container
- `restart:local` -> stop then start local workflow

---

If replicating on another Windows machine, run these in order:

```powershell
npm.cmd install
npm.cmd run dev:local
```

Then browse to http://localhost:5000.
