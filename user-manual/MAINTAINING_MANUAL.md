# Maintaining the User Manual (Quick rerun)

This guide shows the exact steps to re-capture screenshots and regenerate the manual for `recruitiq`. The process overwrites the manual and assets.

Prerequisites
- Node >= 20 and pnpm installed
- Playwright installed in the app package (see below)
- Local dev server for the app running (e.g., `pnpm --filter=recruitiq dev`)

Install Playwright (one-time for the project package):
PowerShell:
```
pnpm --filter=apps/recruitiq add -D @playwright/test
pnpm --filter=apps/recruitiq exec playwright install
```

One-shot full rerun (PowerShell)
1. Start backend and frontend in dev mode (separate terminals)
```
pnpm --filter=backend dev
pnpm --filter=recruitiq dev
```

2. Capture screenshots (will write to `user-manual/tmp-captures/recruitiq/`)
```
pnpm --filter=apps/recruitiq exec playwright test user-manual/playwright/capture.manual.spec.ts --project=chromium --headed
```

3. Generate manual (this will overwrite `user-manual/recruitiq/`)
```
node user-manual/scripts/generate-manual.js
```

4. (Optional) Convert to PDF using md-to-pdf (install if needed)
```
pnpm add -D md-to-pdf
npx md-to-pdf user-manual/recruitiq/manual.md --dest user-manual/recruitiq/manual.pdf
```

Notes
- The generator is idempotent and will clear the target manual folder before writing.
- If a screenshot is missing, the manual will include a short note in place of the image.
