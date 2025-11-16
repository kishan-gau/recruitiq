# E2E Test Suite

## Running E2E Tests (Automated - Recommended)

E2E tests **automatically start and stop the backend server** using Jest's `globalSetup` and `globalTeardown`.

### Quick Start

```powershell
cd C:\RecruitIQ\backend
npm run test:e2e
```

That's it! The test suite will:
1. ✅ Start backend server on port 4000 with test database
2. ✅ Wait for server to be ready
3. ✅ Run all E2E tests
4. ✅ Stop server after tests complete

### How It Works (Industry Standard)

This follows the **industry-standard pattern** used by Next.js, NestJS, and Express projects:

- **`tests/e2e/setup.js`**: Jest `globalSetup` hook spawns backend server process
- **`tests/e2e/teardown.js`**: Jest `globalTeardown` hook stops server process  
- **`jest.e2e.config.js`**: E2E-specific Jest configuration
- **Server isolation**: Each test run gets a fresh server instance with test database

### Manual Server Startup (Alternative)

If you prefer manual control or need to debug:

```powershell
# Terminal 1: Start backend server
cd C:\RecruitIQ\backend
npm run dev

# Terminal 2: Run tests (skip automated server startup)
cd C:\RecruitIQ\backend
npm test -- tests/e2e/sso-integration.test.js
```

### Why Automated Server Startup?

✅ **Test Isolation**: Each run uses test database, no dev data pollution  
✅ **CI/CD Ready**: No manual steps required in pipelines  
✅ **Reproducible**: Same environment every time  
✅ **Industry Standard**: Used by major frameworks  
✅ **Developer Experience**: Single command runs everything

### Test Coverage

**SSO Integration Tests** (`sso-integration.test.js`):
- ✅ AC-3.1.1: Cross-App Session Sharing (4 tests)
- ✅ AC-3.1.2: Seamless Cross-App Navigation (2 tests)
- ✅ AC-3.2.1: Logout Propagates (3 tests)
- ✅ AC-3.3.1: Token Refresh Synchronization (3 tests)
- ✅ AC-3.4.1 & AC-3.4.2: Cookie Configuration (5 tests)
- ✅ Security: Cross-App Tenant Isolation (2 tests)

**Total: 19 tests** validating complete SSO implementation

### Alternative: Automated Server Startup

To run E2E tests with automated server startup:

```powershell
# Start server in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\RecruitIQ\backend; npm run dev" -WindowStyle Minimized

# Wait for server to start
Start-Sleep -Seconds 5

# Run tests
npm test -- tests/e2e/sso-integration.test.js

# Clean up: manually close the background PowerShell window after tests
```

### Troubleshooting

**404 Errors:**
- Ensure backend server is running on port 4000
- Check that `/api/csrf-token` and `/api/auth/tenant/login` endpoints exist

**Connection Refused:**
- Backend server not started
- Port 4000 already in use by another process

**Database Errors:**
- Ensure PostgreSQL test database is running
- Check `.env.test` has correct database credentials
