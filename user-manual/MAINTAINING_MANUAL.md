# Maintaining the User Manual (Quick rerun)

This guide shows the exact steps to re-capture screenshots and regenerate the manual for `apps/web`. The process overwrites the manual and assets.

Prerequisites
- Node >= 20 and pnpm installed
- Playwright installed in the app package (see below)
- Local dev server for the app running (e.g., `pnpm --filter=web dev`)

Install Playwright (one-time for the project package):
PowerShell:
```
pnpm --filter=apps/web add -D @playwright/test
pnpm --filter=apps/web exec playwright install
```

One-shot full rerun (PowerShell)
1. Start backend and frontend in dev mode (separate terminals)
```
pnpm --filter=backend dev
pnpm --filter=web dev
```

2. Capture screenshots (will write to `user-manual/tmp-captures/web/`)
```
pnpm --filter=apps/web exec playwright test user-manual/playwright/capture.manual.spec.ts --project=chromium --headed
```

3. Generate manual (this will overwrite `user-manual/web/`)
```
node user-manual/scripts/generate-manual.js
```

4. (Optional) Convert to PDF using md-to-pdf (install if needed)
```
pnpm add -D md-to-pdf
npx md-to-pdf user-manual/web/manual.md --dest user-manual/web/manual.pdf
```

Notes
- The generator is idempotent and will clear the target manual folder before writing.
- If a screenshot is missing, the manual will include a short note in place of the image.
