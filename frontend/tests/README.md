# Focused PDF and inventory verification

Run `npm test` and `npm run build` from `frontend` using Node 20.19+ or 22.12+ (the bundled Node 24 runtime also works).

The component tests use mocked API responses and cover print/save feedback, manual WhatsApp drafts, invalid/offline/blocked chat opening, loading/missing/failed linked prescriptions with retry, customer prescription actions, and inventory states, signed movements, reasons, and timestamp/ID ordering.

For browser/PDF comparison, start `npm run preview -- --host 127.0.0.1 --port 4173`, then from the repository root run:

```
node frontend/tests/pdf-layout.mjs
python frontend/tests/compare-pdf-layouts.py
```

Browser QA requires Playwright and Chrome. Set `PLAYWRIGHT_MODULE` to an installed/bundled Playwright package if it is not locally installed, or set `PLAYWRIGHT_CHANNEL=edge` to use Edge. The comparison requires Poppler (`PDFTOPPM` can specify its executable), Pillow, and pypdf.

Browser QA uses synthetic data and writes ignored artifacts to `work/pdf-verification`. It compares the actual page flows under print CSS: prescription print versus share, invoice print versus Bill+Rx save and share. Chromium PDF export is used only for verification; the application uses the user's print/save dialog. Inventory history is checked at 375px. It does not send WhatsApp messages, validate the user's native save dialog, or exercise a live database.
