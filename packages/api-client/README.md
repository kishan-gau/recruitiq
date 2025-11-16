# @recruitiq/api-client

Unified API client for the RecruitIQ platform. Provides consistent access to all product APIs (RecruitIQ ATS, Paylinq Payroll, Nexus HRIS, and Portal Admin) with shared authentication, error handling, and request management.

## Features

- **Unified Authentication**: Single sign-on across all products
- **Automatic Token Refresh**: Seamless token renewal on expiration
- **Type-Safe**: Full TypeScript support with type definitions
- **Error Handling**: Consistent error handling and retry logic
- **Product-Specific Clients**: Organized endpoints by product
- **MFA Support**: Multi-factor authentication integration
- **Session Management**: Device and session control

## Installation

This package is part of the monorepo and is installed automatically via pnpm workspaces.

```bash
pnpm install
```

## Usage

### Quick Start

```typescript
import api from '@recruitiq/api-client';

// Login
await api.auth.login({ email: 'user@example.com', password: 'password' });

// Use product APIs
const jobs = await api.recruitiq.getJobs();
const workers = await api.paylinq.getWorkers();
const customers = await api.portal.getCustomers();
```

### Custom Configuration

```typescript
import { RecruitIQPlatformAPI } from '@recruitiq/api-client';

const api = new RecruitIQPlatformAPI({
  baseURL: 'https://api.recruitiq.com',
  timeout: 30000,
  withCredentials: true,
});
```

### Product-Specific Usage

```typescript
// RecruitIQ ATS
const candidates = await api.recruitiq.getCandidates({ status: 'active' });
await api.recruitiq.createJob(jobData);
await api.recruitiq.scheduleInterview(interviewData);

// Paylinq Payroll
const payrollRuns = await api.paylinq.getPayrollRuns();
await api.paylinq.processPayrollRun(runId);
await api.paylinq.generatePayslips(runId);

// Portal Admin
const licenseCustomers = await api.portal.getCustomers();
await api.portal.renewLicense(customerId, 12);
await api.portal.deployInstance(deploymentConfig);
```

## API Structure

### Core APIs

#### Authentication (`api.auth`)
- `login(credentials)` - User login
- `register(data)` - User registration
- `logout()` - User logout
- `getMe()` - Get current user
- `getMFAStatus()` - Get MFA status
- `setupMFA()` - Setup MFA
- `verifyMFA(mfaToken, token)` - Verify MFA code
- `getActiveSessions()` - Get active sessions
- `revokeSession(sessionId)` - Revoke session

### Product APIs

#### RecruitIQ ATS (`api.recruitiq`)
- **Organizations**: `getOrganization()`, `updateOrganization(data)`
- **Workspaces**: `getWorkspaces()`, `createWorkspace(data)`, `getWorkspaceMembers(id)`
- **Users**: `getUsers()`, `createUser(data)`, `updateUser(id, data)`
- **Jobs**: `getJobs()`, `createJob(data)`, `getPublicJobs()`
- **Candidates**: `getCandidates()`, `createCandidate(data)`, `getCandidateApplications(id)`
- **Applications**: `getApplications()`, `createApplication(data)`, `trackApplication(code)`
- **Interviews**: `getInterviews()`, `createInterview(data)`, `submitInterviewFeedback(id, feedback)`
- **Flow Templates**: `getFlowTemplates()`, `createFlowTemplate(data)`, `cloneFlowTemplate(id)`

#### Paylinq Payroll (`api.paylinq`)
- **Workers**: `getWorkers()`, `createWorker(data)`, `getWorkerPayslips(id)`
- **Tax Rules**: `getTaxRules()`, `createTaxRule(data)`, `validateTaxRule(data)`
- **Payroll Runs**: `getPayrollRuns()`, `createPayrollRun(data)`, `processPayrollRun(id)`, `approvePayrollRun(id)`
- **Payslips**: `getPayslips()`, `generatePayslips(runId)`, `downloadPayslip(id)`, `emailPayslip(id)`
- **Time & Attendance**: `getTimeEntries()`, `createTimeEntry(data)`, `approveTimeEntry(id)`, `bulkApproveTimeEntries(ids)`
- **Scheduling**: `getShifts()`, `createShift(data)`, `assignShift(id, workerId)`, `getSchedule(start, end)`
- **Reports**: `getPayrollSummary()`, `getTaxSummary()`, `getWorkerCostReport()`, `exportReport(type)`

#### Portal Admin (`api.portal`)
- **Dashboard**: `getDashboardMetrics()`, `getUpcomingRenewals()`, `getAnalytics(period)`
- **Customers**: `getCustomers()`, `createCustomer(data)`, `getCustomerUsage(id)`, `getCustomerActivity(id)`
- **Licenses**: `renewLicense(id, months)`, `suspendLicense(id)`, `reactivateLicense(id)`, `downloadLicenseFile(id)`
- **Tiers**: `getTiers()`, `createTierVersion(data)`, `previewTierMigration(tier)`, `executeTierMigration(id)`
- **Security**: `getSecurityDashboard()`, `getSecurityEvents()`, `getSecurityAlerts()`, `acknowledgeAlert(id)`
- **Deployment**: `deployInstance(config)`, `getDeploymentStatus(jobId)`, `cancelDeployment(jobId)`
- **VPS**: `getVPSInstances()`, `createVPSInstance(data)`, `startVPSInstance(name)`, `stopVPSInstance(name)`
- **Users**: `getPortalUsers()`, `createPortalUser(data)`, `updateUserPermissions(id, perms)`
- **Roles**: `getRoles()`, `createRole(data)`, `updateRole(id, data)`
- **Logs**: `getLogs()`, `getSystemLogs()`, `searchLogs(query)`

## Authentication Flow

```typescript
// 1. Login
const response = await api.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// 2. Handle MFA if required
if (response.mfaRequired) {
  const mfaResponse = await api.auth.verifyMFA(response.mfaToken, '123456');
}

// 3. Tokens are automatically stored and managed
// All subsequent requests include the authentication token

// 4. Logout
await api.auth.logout();
```

## Token Management

Tokens are automatically managed by the client. You can access the token storage if needed:

```typescript
const tokenStorage = api.getTokenStorage();

// Manual token operations (rarely needed)
const token = tokenStorage.getToken();
tokenStorage.setToken(newToken, refreshToken, expiresIn);
tokenStorage.clearTokens();
const isExpired = tokenStorage.isTokenExpired();
```

## Error Handling

```typescript
try {
  await api.recruitiq.createJob(jobData);
} catch (error) {
  if (error.response?.status === 401) {
    // Authentication error
  } else if (error.response?.status === 403) {
    // Permission error
  } else {
    // Other errors
    console.error(error.message);
  }
}
```

## Custom Token Storage

You can provide custom token storage (e.g., for React Native):

```typescript
import { RecruitIQPlatformAPI, TokenStorage } from '@recruitiq/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const customTokenStorage: TokenStorage = {
  getToken: async () => await AsyncStorage.getItem('token'),
  setToken: async (token, refresh, expires) => {
    await AsyncStorage.setItem('token', token);
    // ...
  },
  clearTokens: async () => await AsyncStorage.clear(),
  getRefreshToken: async () => await AsyncStorage.getItem('refreshToken'),
  isTokenExpired: () => {
    // Custom logic
    return false;
  },
};

const api = new RecruitIQPlatformAPI({}, customTokenStorage);
```

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Run tests
pnpm test
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  APIClientConfig,
  TokenStorage,
  LoginCredentials,
  RegisterData,
  MFASetupResponse,
  SessionInfo,
} from '@recruitiq/api-client';
```
