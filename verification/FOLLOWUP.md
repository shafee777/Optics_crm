# Audit follow-up — 2026-09-30

## Addressed findings

| Finding | Result |
| --- | --- |
| 6 — cancellation runtime verification | Passed in the full isolated backend run, including refunds, stock restoration, and concurrent cancellation protection. |
| 7 — query validation | Product listing now validates item type, boolean filter, search shape, integer limit (1–1000), and nonnegative integer offset. Customer/order pagination rejects fractions; order status must be recognized. A regression test checks ten malformed requests and a supported product query. Other mounted controllers reading query parameters already use schemas. The legacy messages router remains unmounted. |
| 10 — annual reminder errors | Visible error and Retry button replace console-only failures. Loading/error states no longer show a misleading zero count. Responses after unmount are ignored. |
| 11 — dependency release gate | All three full npm audits report zero vulnerabilities. Desktop initially had four high-severity dependency findings; upgrading electron-builder from 24.13.3 to 26.15.3 resolved them. Full JSON evidence is saved beside this report. |
| 13 — confirmed-unused cleanup | Completed the scoped cleanup below after reference and duplicate-content checks. |

## Cleanup evidence

- Removed seven tracked `backend/*test_output.txt` snapshots; no source, script, or documentation references found. Current executable tests and release reports are retained.
- Removed six unused `frontend/src/components/ui` components. Their only internal cross-reference was dialog → button; application code did not import them. No dynamic import glob or require loader referenced them.
- Removed the unused `src/lib/utils.js` re-export and `components.json` generator configuration belonging to that scaffolding.
- Removed unused `public/favicon.svg` and `public/icons.svg`. The HTML uses `favicon.png`.
- Removed `public/logo.png`, which matched `src/assets/logo.png` byte-for-byte (SHA-256 `24BAE50F431D6CABB28D77BE3406E96429555B81BA84D9BE3DC6261756FAA3BB`). Login and layout import the retained asset.
- Removed six direct dependencies referenced only by the unused scaffolding, or not imported anywhere: `@base-ui/react`, `@fontsource-variable/geist`, `class-variance-authority`, `cn`, `shadcn`, and `tw-animate-css`. The uninstall removed 305 installed packages. Required Windows optional bindings were restored using Node 24.
- Retained desktop icons and assets needed by packaging and separate desktop entry points. Retained legacy database/provider code rather than assuming that historical compatibility code is safe to remove.

## Validation

- Full isolated backend suite: **68 passed, 0 failed, 0 skipped**.
- Migration reruns and full contents of all **18 public tables** after backup/restore: passed.
- Frontend production build: passed.
- Frontend lint: passed, **52 warnings, no errors**. Remaining warnings and large-bundle optimization are separate follow-up work.
- Rebuilt packaged executable: offline renderer/local API, owner setup, billing, stock, backup and restored order smoke checks passed (`work/p3-desktop-smoke.log`).
- Audits: `npm-audit-backend.json`, `npm-audit-frontend.json`, `npm-audit-desktop.json`; all include development dependencies and report zero findings as of this run.
- Detailed local logs: `work/p2-followup-database.log`, `work/p3-build.log`, `work/p3-lint.log`, and `work/p3-installer.log`.

The existing P2 report's limits still apply: physical printing, real network disconnection, interactive wizard walkthrough, and an upgrade over an existing installation are not covered by these automated checks. The reminder error/retry change was checked through source review, build, and lint, not a browser interaction test.

## Rebuilt installer

Windows x64 NSIS build passed with electron-builder 26.15.3. Artifact: desktop/release/Optics-CRM-Setup-1.0.0.exe.

SHA-256: 0D2A4794978F413AB2F9F3EE77B64850CB55363FFEC984507462BDAEEC6127B3.

The rebuilt packaged app passed its smoke test. Silent install/uninstall was verified in the earlier P2 run; that cycle was not repeated for this rebuild.
