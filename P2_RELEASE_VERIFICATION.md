# P2 release verification — 2026-09-30

Follow-up: see [verification/FOLLOWUP.md](verification/FOLLOWUP.md) for the subsequent validation fixes, 68-test run, dependency audit results, cleanup, and rebuilt artifact details. The checks and installer hash below describe the earlier P2 artifact.

Automated release checks passed on Windows against the current working tree. Existing shop data was not used, seeded, migrated, or restored over. Existing uncommitted project changes were preserved.

| Check | Result |
| --- | --- |
| Fresh bundled PostgreSQL cluster | Passed; separate `work/desktop-check-*` directory and random local port |
| Migrations | All 14 SQL migration files applied, through `013_optional_customer_phone.sql`; two CLI reruns passed |
| Full backend suite | 67 passed, 0 failed, 0 skipped across all six test files |
| Backup/restore | Real `pg_dump` and `pg_restore` into a separate database; all row contents matched across all 18 public tables |
| Frontend production build | Passed using Node 24 and relative `/api/v1`; large bundle warning remains |
| Frontend lint | Runs successfully after repairing the Windows native binding; 55 warnings, no errors |
| Desktop offline smoke | Passed with renderer requests outside the local API origin blocked and `navigator.onLine` false |
| Windows NSIS build | Passed for x64, Electron 44.4.5 |
| Actual installer | Silent installation into `work/p2-installer-check` passed; installed executable smoke test passed |
| Temporary uninstall | Exited 0 after the installed-app test |

## Fixes and verification improvements

- Both isolated test runners now discover every backend test file. Previously PDF billing and production safeguard tests were omitted.
- Corrected the cancellation audit test to use the invoice number, matching the existing application behavior, and scoped the assertion to the product and store. Stock restoration and duplicate cancellation checks remain intact.
- Database verification compares complete table contents rather than row counts for only eight tables. Evidence includes the verification time and actual table list.
- Desktop smoke verification now loads the built login screen in a hidden sandboxed renderer, logs in through the local API, creates a customer without a phone number, creates inventory and an order, records full payment, checks zero balance and reduced stock, and confirms the order survives backup/restore. Closing the smoke window no longer shuts down PostgreSQL before the restore test finishes.
- Updated local setup documentation to reflect the completed restore drill and available verification commands.

## Evidence and reproduction

Local evidence is under the ignored `work` directory:

- `p2-database.log` — all 67 tests and successful restore comparison.
- `desktop-verification.json` — isolated cluster location, timestamp, and all 18 tables.
- `p2-installer-build.log` — final installer build.
- `p2-installed-smoke.log` and `p2-installed-smoke-error.log` — successful installed executable verification.
- `p2-lint.log` — remaining warnings.

From `desktop`, run `npm run test:database` with the bundled PostgreSQL binaries available. Run `npm run dist` after rebuilding the frontend with `VITE_API_URL=/api/v1`, then launch the release executable with `--smoke-test` for a fresh temporary profile. Normal application launches use the real user profile; smoke launches do not.

Final installer: `desktop/release/Optics-CRM-Setup-1.0.0.exe`.

SHA-256: `68CADE864E4A57A4EB999564CA4B9A457A3114739C065EECE50EFBF96A6A2A17`.

## Scope limits

Offline verification is a renderer/local-API smoke test with external renderer traffic blocked, not a physical network disconnection or a click-through of every screen. PDF billing and WhatsApp offline behavior are covered by backend test files. Physical printing, interactive installer wizard behavior, and upgrade from an existing installation were not exercised. The installer is unsigned. Lint warnings and bundle-size optimization remain follow-up work. Test clusters and temporary smoke profiles are retained for inspection; their PostgreSQL processes are stopped.
