# E2E Testing Guide

## Prerequisites

Before running e2e tests, you need to start all required services:

### Option 1: Start All Services Together (Recommended)

From the repository root:

```powershell
npm run dev:all
```

This starts:
- Backend API (port 4000)
- PayLinq Frontend (port 5174)
- Dev Gateway (port 3000)

### Option 2: Start Services Individually

1. **Start Backend**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Start PayLinq Frontend** (in a new terminal)
   ```powershell
   cd apps/paylinq
   pnpm dev
   ```

3. **Start Dev Gateway** (in a new terminal)
   ```powershell
   cd dev-gateway
   npm start
   ```

## Running E2E Tests

Once all services are running:

```powershell
cd apps/paylinq
npm run test:e2e
```

### Run Specific Test File

```powershell
npm run test:e2e -- create-payroll-run-modal.spec.ts
```

### Run with UI

```powershell
npm run test:e2e:ui
```

### Debug Mode

```powershell
npm run test:e2e:debug
```

## Authentication

E2E tests use an authentication setup that runs before all tests. The auth state is stored in `playwright/.auth/user.json` and reused across test runs.

Test credentials:
- Email: test@example.com
- Password: password123

## Troubleshooting

### Tests timeout looking for elements

- Make sure all three services (backend, frontend, gateway) are running
- Check that http://localhost:3000 loads the application
- Verify you can log in manually at http://localhost:3000/login

### Auth setup fails

- Ensure the backend is running and accepting login requests
- Check that test user exists in the database
- Clear the auth state: `rm -rf playwright/.auth`

### Port conflicts

- Backend should be on port 4000
- Frontend (Vite) should be on port 5174
- Gateway should be on port 3000

If ports are in use, stop conflicting processes or update the configuration.
