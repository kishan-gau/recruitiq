# @recruitiq/auth

Shared authentication and authorization module for the RecruitIQ platform.

## Features

- **SSO Authentication**: Single Sign-On across all RecruitIQ apps (RecruitIQ, Portal, Paylinq, Nexus)
- **Session Management**: Automatic token refresh and session validation
- **MFA Support**: Multi-factor authentication with grace periods
- **Role-Based Access**: Role and permission checking
- **Protected Routes**: Easy route protection with redirects
- **Type-Safe**: Full TypeScript support

## Installation

```bash
pnpm add @recruitiq/auth @recruitiq/api-client
```

## Usage

### Basic Setup

Wrap your app with `AuthProvider`:

```tsx
import { AuthProvider } from '@recruitiq/auth';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

### Using Authentication

```tsx
import { useAuth } from '@recruitiq/auth';

function LoginPage() {
  const { login, error, isLoading } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    const result = await login({ email, password });
    
    if (result === true) {
      // Login successful
      navigate('/dashboard');
    } else if (typeof result === 'object' && result.mfaRequired) {
      // MFA required
      navigate('/mfa', { state: { mfaToken: result.mfaToken } });
    }
  };

  return <LoginForm onSubmit={handleLogin} error={error} loading={isLoading} />;
}
```

### Protected Routes

```tsx
import { ProtectedRoute } from '@recruitiq/auth';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute requireRole="admin">
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

### Checking User Roles

```tsx
import { useAuth } from '@recruitiq/auth';

function MyComponent() {
  const { user, isAdmin, isRecruiter, permissions } = useAuth();

  if (isAdmin) {
    return <AdminView />;
  }

  if (permissions.includes('manage_payroll')) {
    return <PayrollManager />;
  }

  return <DefaultView />;
}
```

## API Reference

### useAuth()

Returns the authentication context with the following properties:

**State:**
- `user: User | null` - Current authenticated user
- `isAuthenticated: boolean` - Whether user is logged in
- `isLoading: boolean` - Loading state
- `error: string | null` - Current error message
- `mfaWarning: string | null` - MFA grace period warning

**User Properties:**
- `organizationId: string | null`
- `workspaceId: string | null`
- `permissions: string[]`

**Role Checks:**
- `isRecruiter: boolean`
- `isAdmin: boolean`
- `isOwner: boolean`
- `isPlatformAdmin: boolean`

**Methods:**
- `login(credentials)` - Login with email/password
- `loginWithMFA(mfaToken, code)` - Complete MFA login
- `logout()` - Logout user
- `register(data)` - Register new user
- `refreshSession()` - Refresh session data
- `dismissMfaWarning()` - Dismiss MFA warning
- `clearError()` - Clear current error

## Architecture

This module provides a consistent authentication layer across all RecruitIQ apps:

```
┌─────────────────────────────────────────────┐
│           @recruitiq/auth                   │
│  (Shared Authentication Context & Hooks)    │
└─────────────────┬───────────────────────────┘
                  │
       ┌──────────┼──────────┬──────────┐
       │          │          │          │
   ┌───▼───┐  ┌──▼───┐  ┌───▼───┐  ┌──▼─────┐
   │RecruitIQ│ │Portal│ │Paylinq│ │ Nexus │
   └─────────┘ └──────┘ └───────┘ └────────┘
       │          │          │          │
       └──────────┴──────────┴──────────┘
                  │
       ┌──────────▼───────────┐
       │ @recruitiq/api-client│
       │   (REST API Calls)   │
       └──────────┬───────────┘
                  │
          ┌───────▼────────┐
          │  Backend API   │
          │  (auth routes) │
          └────────────────┘
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Test
pnpm test
```
