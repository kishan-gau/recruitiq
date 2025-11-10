# Backend Scripts

This directory contains utility scripts for backend operations, testing, and security.

## 🔐 Security Scripts

### Generate Secrets (`generate-secrets.ps1`)

Generates cryptographically secure secrets for production deployment.

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-secrets.ps1
```

**Generates**:
- JWT_SECRET (256-bit)
- JWT_REFRESH_SECRET (256-bit)
- POSTGRES_PASSWORD (256-bit)
- REDIS_PASSWORD (256-bit)
- ENCRYPTION_MASTER_KEY (512-bit)
- SESSION_SECRET (512-bit)

**Output**: Copy the generated values to your `.env` file.

**Important**:
- ⚠️ Generate different secrets for dev, staging, and production
- ⚠️ Never commit secrets to version control
- ⚠️ Store secrets securely (password manager, AWS Secrets Manager, etc.)
- ⚠️ Rotate secrets every 90 days

---

## 🧪 Testing Scripts

### Run All Tests (`run-all-tests.ps1`)
Runs all test suites (Jest unit tests and BDD tests).

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-all-tests.ps1
```

### Run Jest Only
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-all-tests.ps1 -JestOnly
```

### Run BDD Only
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-all-tests.ps1 -BDDOnly
```

---

## 📊 Database Scripts

### Migration Scripts (`add-*.js`)
Database migration scripts for adding new columns/features.

**Usage**:
```bash
npm run migrate:up
npm run migrate:down
```

---

## 🔍 Security Audit Scripts

### SQL Injection Audit
```bash
npm run audit:sql
```

### Security Headers Test
```bash
npm run test:security
```

### Application Security Audit
```bash
npm run audit:app
```

---

## 🚀 Deployment Scripts

### Deployment Check
```bash
npm run deploy:check
```

Verifies:
- Environment variables are set
- Secrets meet security requirements
- Database connection works
- Redis connection works
- Required dependencies installed

---

## 📝 Available npm Scripts

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:all": "run-all-tests.ps1",
    "test:security": "test-security-headers.js",
    "audit:sql": "sql-injection-audit.js",
    "audit:security": "npm audit --audit-level=moderate",
    "audit:app": "security-audit.js",
    "deploy:check": "deployment-check.js"
  }
}
```

---

## 🛠️ Adding New Scripts

When creating new scripts:

1. **Use descriptive names**: `verb-noun.ps1` or `verb-noun.js`
2. **Add usage documentation**: Include help/usage info in script
3. **Handle errors**: Exit with appropriate error codes
4. **Log operations**: Use console.log for progress, console.error for errors
5. **Update this README**: Document the new script

---

## 📚 Learn More

- Security Guide: `../SECURITY_QUICK_REFERENCE.md`
- Implementation Details: `../SECURITY_FIXES_IMPLEMENTED.md`
- Environment Setup: `../.env.example`
