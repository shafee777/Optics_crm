# Optics CRM — local shop edition

React + Express + local PostgreSQL. Customers, prescriptions, orders, payments, inventory and reports run on the shop computer. WhatsApp is a manual, internet-dependent draft action.

## Build and start

Use Node.js 22.12+ (or a supported newer LTS). The Windows Node.js currently on PATH is 20.16 and is too old for the project's Vite version.

1. Install dependencies in `backend` and `frontend` with `npm ci` while internet is available. Keep the installed dependencies on the shop PC.
2. Configure `backend/.env` with the local PostgreSQL `DATABASE_URL`, strong JWT secrets and `PORT=5000`. The backend defaults to `HOST=127.0.0.1`.
3. Back up the existing database before upgrading; see below. Do not run the development seed against shop data.
4. From `backend`, run `npm run migrate`. Migration 011 adds inventory history, a nonnegative-stock constraint for new writes and a flag identifying new discount allocation. Existing invoices and stock counts are not rewritten.
5. From the project folder, run `./Build-Local.ps1`, then `./Start-Local.ps1`. Open http://127.0.0.1:5000. Keep that terminal running. PostgreSQL must also be running.

The production backend serves `frontend/dist` and `/api/v1` together. `Build-Local.ps1` forces the relative API URL even if an old frontend environment file points at a cloud server. In development, Vite proxies the API to the local backend. Fonts fall back to system fonts; no Google Fonts request is required.

Disconnect internet and verify the real shop workflow after installation. The computer and local PostgreSQL must stay on. WhatsApp explicitly warns when the browser reports offline; browser online status does not guarantee internet reachability.

## Updating the Windows desktop app

The installed desktop app bundles its own frontend and backend. Editing this
repository or starting the browser application does not update an installed app.
With Node.js 22.12+ on PATH, run `npm run dist` from `desktop`, close Optics CRM
using File → Quit, then run the new installer from `desktop/release`. Install
over the existing installation; shop records and configuration remain in
`%APPDATA%/Optics CRM`. Make a shop backup before upgrading.

Desktop `start`, `pack`, and `dist` now build the current frontend with the local
API URL and stage the current backend and migrations automatically. For local
desktop development, use `npm start` from `desktop` and restart after changes.

## Backup and restore

Install PostgreSQL command-line tools matching the database server's major version (this project's Compose file uses PostgreSQL 16). Put them on PATH or set `PG_BIN` to the folder containing `pg_dump` and `pg_restore`. In PowerShell, for example: `$env:PG_BIN = 'C:\path\to\postgresql\bin'`.

From `backend`:

```powershell
npm run db:backup -- 'D:\OpticsBackups'
npm run db:restore -- 'D:\OpticsBackups\optics-TIMESTAMP.dump' optics_restored
```

Backup uses PostgreSQL's consistent custom-format dump, checks that the archive is readable, then renames it from `.partial` to `.dump`. Failed backups remain `.partial` and must not be treated as verified archives. Customer data stays local; choose a private backup folder and maintain a copy on a separate device.

Restore creates a NEW database and restores in one transaction. It refuses the active database name and will not overwrite an existing database. On failure, the new empty database may remain for investigation. Verify a restored copy before changing `DATABASE_URL` and restarting. Archive readability is not a substitute for a successful restore drill.

The 2026-09-30 release verification used bundled PostgreSQL tools for a real backup/restore drill in an isolated cluster. All 18 public tables matched after restoration. The active shop database was not migrated or changed. See `P2_RELEASE_VERIFICATION.md` for evidence and scope.

## Behavior changes

- Stock is deducted only for products explicitly selected from inventory. Free-text/custom order lines remain untracked and no longer create negative-stock products automatically.
- Insufficient stock or a product belonging to another store rejects the complete order transaction.
- Cancellation locks the order, checks its state and restores stock exactly once. Existing historical cancellations are not retroactively changed.
- The inventory trigger records opening balances, sales, cancellations, purchases and manual quantity edits. Inventory → History shows the latest 200 movements per product.
- Existing negative stock is preserved for reconciliation. The new constraint rejects writes leaving a negative quantity. Correct these counts to the actual physical stock; do not blindly reset them. After reconciliation, the constraint can be validated with `ALTER TABLE products VALIDATE CONSTRAINT products_stock_nonnegative;`.
- Payment balance checks and insertion share an order lock. Supplier payments reject overpayment and cancelled purchases. Purchases validate supplier/product store ownership.
- Prices include GST. The order discount is allocated in paise before extracting CGST/SGST. Additional tax on a GST-inclusive bill is rejected. Historical invoices retain their original figures.
- Pickup, payment reminder, annual checkup, review request and prescription actions open `wa.me` drafts. Staff review and press Send in WhatsApp. Opening is not logged as sent/delivered. No automatic offline queue is used. The old automated provider endpoints are unmounted; legacy provider code/data remains unused for compatibility and rollback.
- Dialogs support Escape, focus trapping/restoration and associated labels; key controls have accessible names and notifications use a live status.

## Verification

From `backend`:

```powershell
npm run test:unit
npm run test:isolated
```

`test:isolated` creates a uniquely named local `optics_test_*` database, migrates and seeds only that database, then discovers and runs every backend test file, including PDF billing and production safeguards. The PostgreSQL role needs CREATEDB permission. Test databases are retained for inspection. `npm test` uses the configured database and seeded accounts; prefer the isolated runner.

Frontend: `npm run build` and `npm run lint` from `frontend`. Build was verified with bundled Node 24. The missing Windows oxlint binding was repaired during P2 verification; lint runs with 55 warnings and no errors.

For verification without a configured database, run `npm run test:database` from `desktop` with `desktop/vendor/pgsql` present. It initializes a separate PostgreSQL cluster under `work`, applies migrations, reruns the CLI migrator twice, runs every backend test, and compares all public table contents after backup/restore. It stops that cluster on completion. `npm run test:desktop` uses a separate temporary profile and tests the staged app's offline renderer/API workflow and backup/restore. Rebuild with `npm run dist` before testing the release executable with `--smoke-test`.

## Docker Compose (local dev PostgreSQL)

`docker-compose.yml` reads database credentials from environment variables — credentials are not hardcoded in the file. Create a `.env` file **next to `docker-compose.yml`** before running `docker compose up`:

```env
POSTGRES_USER=optics_user
POSTGRES_PASSWORD=change_me_to_a_strong_password
POSTGRES_DB=optics_crm
```

The PostgreSQL port is bound to `127.0.0.1:5432` only, so the database is not reachable from other machines on the network. Set the matching `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql://optics_user:change_me_to_a_strong_password@127.0.0.1:5432/optics_crm
```

Docker Compose will exit with an error if `POSTGRES_USER` or `POSTGRES_PASSWORD` are not set.

