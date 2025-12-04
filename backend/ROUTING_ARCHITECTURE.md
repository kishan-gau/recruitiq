# Routing Architecture

**Updated:** December 3, 2025  
**Compliance:** API_STANDARDS.md - Product-Based Routing

## Architecture Overview

RecruitIQ follows a strict routing architecture that separates Core Platform routes from Product-specific routes.

## Route Categories

### 1. Core Platform Routes (No /products prefix)

These routes are part of the core platform and are NOT product-specific.

#### Authentication Routes
- **Base Path:** `/api/auth`
- **Router:** `authRoutes` (from `routes/auth.js`)
- **Examples:**
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`

#### Portal/Platform Admin Routes
- **Base Path:** `/api/portal`
- **Purpose:** Platform administration and multi-tenant management
- **Routers:**
  - `/api/portal` - `portalRoutes` (from `routes/portal.js`)
  - `/api/portal` - `provisioningRoutes` (from `routes/provisioning.js`)
  - `/api/portal/users` - `userManagementRoutes` (from `routes/userManagement.js`)
  - `/api/portal/platform-users` - `platformUserRoutes` (from `routes/platformUsers.js`)
  - `/api/portal/roles` - `rolesPermissionsRoutes` (from `routes/rolesPermissions.js`)
  - `/api/portal/vps` - `vpsRoutes` (from `routes/vps.js`)
  - `/api/portal/security` - `securityRoutes` (from `routes/security.js`)

**Examples:**
- `GET /api/portal/dashboard` - Platform dashboard
- `GET /api/portal/users` - List all platform users
- `GET /api/portal/users/:id` - Get specific platform user
- `POST /api/portal/users` - Create platform user
- `PUT /api/portal/users/:id` - Update platform user
- `GET /api/portal/security/dashboard` - Security monitoring dashboard
- `GET /api/portal/security/metrics` - Security metrics

#### Admin Routes
- **Base Path:** `/api/admin`
- **Purpose:** System administration
- **Routers:**
  - `/api/admin` - `adminRouter` (from `routes/admin.js`)
  - `/api/admin/licenses` - `licenseAdminRoutes` (from `routes/licenseAdmin.js`)
  - `/api/admin/products` - `productManagementRoutes` (from `routes/productManagement.js`)

#### Organization Management
- **Base Path:** `/api/organizations`
- **Router:** `organizationRoutes` (from `routes/organizations.js`)

### 2. Product-Specific Routes (/api/products prefix)

All product application endpoints MUST use the `/api/products/{product-slug}` prefix.

**Available Products:**

| Product | Slug | Base Path | Example Endpoint |
|---------|------|-----------|------------------|
| Nexus (HRIS) | `nexus` | `/api/products/nexus` | `/api/products/nexus/employees` |
| PayLinQ (Payroll) | `paylinq` | `/api/products/paylinq` | `/api/products/paylinq/payroll-runs` |
| ScheduleHub | `schedulehub` | `/api/products/schedulehub` | `/api/products/schedulehub/shifts` |
| RecruitIQ | `recruitiq` | `/api/products/recruitiq` | `/api/products/recruitiq/jobs` |

**Product routes are dynamically loaded through ProductManager and mounted at `/api/products`.**

## Route File Standards

### Router Path Conventions

When defining routes in a router file, use **relative paths** since the router will be mounted at a specific base path:

#### ✅ CORRECT: Relative Paths

```javascript
// File: routes/userManagement.js
// Mounted at: /api/portal/users

const router = express.Router();

// Correct - uses relative path
router.get('/', listUsers);           // Accessible at: /api/portal/users
router.get('/:id', getUser);          // Accessible at: /api/portal/users/:id
router.post('/', createUser);         // Accessible at: /api/portal/users
router.put('/:id', updateUser);       // Accessible at: /api/portal/users/:id
router.delete('/:id', deleteUser);    // Accessible at: /api/portal/users/:id
```

#### ❌ WRONG: Absolute Paths in Router

```javascript
// File: routes/userManagement.js
// Mounted at: /api/portal/users

const router = express.Router();

// WRONG - includes base path in route definition
router.get('/users', listUsers);       // Results in: /api/portal/users/users ❌
router.get('/users/:id', getUser);     // Results in: /api/portal/users/users/:id ❌
```

### Mounting in app.js

Routers should be mounted at their full API path in `app.js`:

```javascript
// File: app.js

const apiRouter = express.Router();

// Portal routes mounted with full path
apiRouter.use('/portal/users', userManagementRoutes);
apiRouter.use('/portal/security', securityRoutes);
apiRouter.use('/portal/platform-users', platformUserRoutes);

// Mount apiRouter at /api
app.use('/api', apiRouter);

// Final result:
// /api + /portal/users + / = /api/portal/users
// /api + /portal/security + /dashboard = /api/portal/security/dashboard
```

## Authentication Requirements

### Platform Routes
- **Middleware:** `authenticatePlatform`
- **Cookie:** `platform_access_token`
- **Purpose:** Authenticates platform administrators

### Tenant Routes
- **Middleware:** `authenticate`
- **Cookie:** `tenant_access_token`
- **Purpose:** Authenticates tenant users

## Common Pitfalls

### 1. ❌ Wrong: Missing /products Prefix for Product Routes

```javascript
// Will return 404!
GET /api/nexus/locations        // Missing /products
GET /api/paylinq/worker-types   // Missing /products
```

**Fix:** Always include `/products` prefix:
```javascript
GET /api/products/nexus/locations
GET /api/products/paylinq/worker-types
```

### 2. ❌ Wrong: Double Path Segments

```javascript
// routes/userManagement.js
router.get('/users', listUsers);

// app.js
apiRouter.use('/portal/users', userManagementRoutes);

// Result: /api/portal/users/users ❌
```

**Fix:** Use relative paths in router:
```javascript
// routes/userManagement.js
router.get('/', listUsers);  // ✅

// Result: /api/portal/users ✅
```

### 3. ❌ Wrong: Inconsistent Authentication

```javascript
// Portal route using tenant authentication
router.use(authenticate);  // ❌ Should use authenticatePlatform
```

**Fix:** Use correct authentication middleware:
```javascript
router.use(authenticatePlatform);  // ✅ For portal routes
```

## Verification Checklist

When adding new routes:

- [ ] Is this a Core Platform route or Product-specific route?
- [ ] If Product route: Uses `/api/products/{slug}` prefix?
- [ ] If Portal route: Mounted at `/api/portal/*`?
- [ ] Router uses relative paths (not absolute)?
- [ ] Correct authentication middleware applied?
- [ ] Route follows RESTful conventions?
- [ ] Proper HTTP methods used (GET, POST, PUT, DELETE)?
- [ ] Resource-specific response keys used (not generic "data")?

## References

- **API Standards:** `docs/API_STANDARDS.md`
- **Backend Standards:** `docs/BACKEND_STANDARDS.md`
- **Security Standards:** `docs/SECURITY_STANDARDS.md`
- **Dynamic Product System:** `backend/src/products/core/ProductManager.js`
