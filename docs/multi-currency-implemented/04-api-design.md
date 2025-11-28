# Multi-Currency API Design

**Version:** 2.0  
**Date:** November 13, 2025  
**Dependencies:** Service Layer (03-service-layer.md)

---

## Overview

RESTful API endpoints for multi-currency management, aligned with existing PayLinQ API patterns and standards.

---

## API Design Principles

1. **Consistency:** Follow existing PayLinQ API patterns (documented in `docs/API_STANDARDS.md`)
2. **Versioning:** All endpoints under `/api/paylinq/v1`
3. **Standard Response Format:** `{ success, data, error, message }`
4. **Pagination:** Offset-based with `{ page, limit, total, hasNext, hasPrev }`
5. **Error Codes:** Specific codes for currency operations

---

## Exchange Rate Management Endpoints

### 1. Get Exchange Rates

**Endpoint:** `GET /api/paylinq/exchange-rates`

**Description:** Retrieve exchange rates with filtering and pagination

**Query Parameters:**
```typescript
{
  fromCurrency?: string;     // Filter by source currency (ISO 4217)
  toCurrency?: string;       // Filter by target currency
  effectiveDate?: string;    // Get rates for specific date (ISO 8601)
  rateType?: string;         // 'market' | 'fixed' | 'manual' | 'average'
  isActive?: boolean;        // Filter active/inactive rates
  page?: number;             // Page number (default: 1)
  limit?: number;            // Items per page (default: 50, max: 200)
  sortBy?: string;           // 'effective_from' | 'rate' | 'created_at'
  sortOrder?: 'ASC' | 'DESC'; // Default: 'DESC'
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "id": "uuid",
        "fromCurrency": "USD",
        "toCurrency": "SRD",
        "rate": 17.850000,
        "inverseRate": 0.055866,
        "rateType": "manual",
        "rateSource": "manual",
        "effectiveFrom": "2025-11-13T00:00:00Z",
        "effectiveTo": null,
        "isActive": true,
        "notes": "Monthly rate update",
        "createdAt": "2025-11-13T10:30:00Z",
        "createdBy": {
          "id": "uuid",
          "name": "John Doe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 125,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions

---

### 2. Get Current Exchange Rate

**Endpoint:** `GET /api/paylinq/exchange-rates/current/:fromCurrency/:toCurrency`

**Description:** Get current exchange rate for a specific currency pair

**Path Parameters:**
- `fromCurrency` - Source currency code (ISO 4217)
- `toCurrency` - Target currency code (ISO 4217)

**Query Parameters:**
```typescript
{
  asOfDate?: string;  // Optional: Get rate as of specific date (ISO 8601)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rate": {
      "id": "uuid",
      "fromCurrency": "USD",
      "toCurrency": "SRD",
      "rate": 17.850000,
      "inverseRate": 0.055866,
      "rateType": "manual",
      "rateSource": "manual",
      "effectiveFrom": "2025-11-13T00:00:00Z",
      "effectiveTo": null,
      "isActive": true
    },
    "conversion": {
      "example": "1 USD = 17.85 SRD",
      "inverse": "1 SRD = 0.0559 USD"
    }
  }
}
```

**Error Responses:**
- `404 Not Found` - No exchange rate found for currency pair
  ```json
  {
    "success": false,
    "error": "Exchange rate not found",
    "errorCode": "EXCHANGE_RATE_NOT_FOUND",
    "message": "No exchange rate found for USD → SRD on 2025-11-13"
  }
  ```
- `400 Bad Request` - Invalid currency codes

---

### 3. Create Exchange Rate

**Endpoint:** `POST /api/paylinq/exchange-rates`

**Description:** Create a new exchange rate

**Request Body:**
```json
{
  "fromCurrency": "USD",
  "toCurrency": "SRD",
  "rate": 17.85,
  "rateType": "manual",
  "rateSource": "Central Bank Suriname",
  "effectiveFrom": "2025-11-13T00:00:00Z",
  "effectiveTo": null,
  "notes": "Monthly rate update for November"
}
```

**Validation Rules:**
- `fromCurrency` - Required, 3-char ISO 4217 code
- `toCurrency` - Required, 3-char ISO 4217 code, must differ from fromCurrency
- `rate` - Required, positive number, max 6 decimals
- `rateType` - Optional, enum: ['market', 'fixed', 'manual', 'average']
- `rateSource` - Optional, max 50 characters
- `effectiveFrom` - Required, ISO 8601 date
- `effectiveTo` - Optional, must be after effectiveFrom
- `notes` - Optional, max 1000 characters

**Response:**
```json
{
  "success": true,
  "data": {
    "rate": {
      "id": "uuid",
      "fromCurrency": "USD",
      "toCurrency": "SRD",
      "rate": 17.850000,
      "inverseRate": 0.055866,
      "rateType": "manual",
      "rateSource": "Central Bank Suriname",
      "effectiveFrom": "2025-11-13T00:00:00Z",
      "effectiveTo": null,
      "isActive": true,
      "notes": "Monthly rate update for November",
      "createdAt": "2025-11-13T14:30:00Z",
      "createdBy": {
        "id": "uuid",
        "name": "Admin User"
      }
    }
  },
  "message": "Exchange rate created successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
  ```json
  {
    "success": false,
    "error": "Validation error",
    "errorCode": "VALIDATION_ERROR",
    "details": {
      "rate": "Rate must be a positive number"
    }
  }
  ```
- `409 Conflict` - Overlapping rate exists
  ```json
  {
    "success": false,
    "error": "Conflict",
    "errorCode": "RATE_OVERLAP",
    "message": "An active rate already exists for this currency pair on the specified date"
  }
  ```

---

### 4. Update Exchange Rate

**Endpoint:** `PUT /api/paylinq/exchange-rates/:id`

**Description:** Update an existing exchange rate

**Request Body:**
```json
{
  "rate": 18.00,
  "rateType": "manual",
  "rateSource": "Market update",
  "effectiveTo": "2025-12-01T00:00:00Z",
  "notes": "Updated to reflect market changes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rate": {
      "id": "uuid",
      "fromCurrency": "USD",
      "toCurrency": "SRD",
      "rate": 18.000000,
      "inverseRate": 0.055556,
      // ... other fields
      "updatedAt": "2025-11-13T15:00:00Z",
      "updatedBy": {
        "id": "uuid",
        "name": "Admin User"
      }
    },
    "audit": {
      "oldRate": 17.85,
      "newRate": 18.00,
      "changePercentage": 0.84
    }
  },
  "message": "Exchange rate updated successfully"
}
```

---

### 5. Bulk Update Exchange Rates

**Endpoint:** `POST /api/paylinq/exchange-rates/bulk`

**Description:** Create or update multiple exchange rates at once (useful for automated imports)

**Request Body:**
```json
{
  "rateSource": "ECB Daily Rates",
  "effectiveFrom": "2025-11-13T00:00:00Z",
  "rates": [
    {
      "fromCurrency": "USD",
      "toCurrency": "SRD",
      "rate": 17.85
    },
    {
      "fromCurrency": "EUR",
      "toCurrency": "SRD",
      "rate": 19.20
    },
    {
      "fromCurrency": "GBP",
      "toCurrency": "SRD",
      "rate": 21.50
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "created": 2,
      "updated": 1,
      "failed": 0
    },
    "rates": [
      {
        "fromCurrency": "USD",
        "toCurrency": "SRD",
        "status": "updated",
        "rateId": "uuid"
      },
      {
        "fromCurrency": "EUR",
        "toCurrency": "SRD",
        "status": "created",
        "rateId": "uuid"
      },
      {
        "fromCurrency": "GBP",
        "toCurrency": "SRD",
        "status": "created",
        "rateId": "uuid"
      }
    ]
  },
  "message": "Bulk rate update completed: 2 created, 1 updated"
}
```

---

### 6. Get Exchange Rate History

**Endpoint:** `GET /api/paylinq/exchange-rates/:id/history`

**Description:** Get audit trail of changes for a specific exchange rate

**Response:**
```json
{
  "success": true,
  "data": {
    "rate": {
      "id": "uuid",
      "fromCurrency": "USD",
      "toCurrency": "SRD",
      "currentRate": 18.00
    },
    "history": [
      {
        "id": "uuid",
        "oldRate": 17.85,
        "newRate": 18.00,
        "changePercentage": 0.84,
        "changeReason": "Market adjustment",
        "changeType": "manual_update",
        "changedBy": {
          "id": "uuid",
          "name": "Admin User"
        },
        "changedAt": "2025-11-13T15:00:00Z"
      },
      {
        "id": "uuid",
        "oldRate": null,
        "newRate": 17.85,
        "changePercentage": null,
        "changeReason": "Initial rate",
        "changeType": "initial",
        "changedBy": {
          "id": "uuid",
          "name": "System"
        },
        "changedAt": "2025-11-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 7. Delete Exchange Rate

**Endpoint:** `DELETE /api/paylinq/exchange-rates/:id`

**Description:** Deactivate an exchange rate (soft delete)

**Response:**
```json
{
  "success": true,
  "message": "Exchange rate deactivated successfully"
}
```

---

## Currency Conversion Endpoints

### 8. Convert Amount

**Endpoint:** `POST /api/paylinq/currency/convert`

**Description:** Convert an amount from one currency to another (utility endpoint, does not create paycheck)

**Request Body:**
```json
{
  "fromCurrency": "USD",
  "toCurrency": "SRD",
  "amount": 1000,
  "effectiveDate": "2025-11-13"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversion": {
      "fromCurrency": "USD",
      "toCurrency": "SRD",
      "fromAmount": 1000.00,
      "toAmount": 17850.00,
      "rate": 17.850000,
      "rateSource": "manual",
      "effectiveDate": "2025-11-13",
      "calculation": "1000.00 USD × 17.85 = 17,850.00 SRD"
    }
  }
}
```

---

### 9. Get Conversion History

**Endpoint:** `GET /api/paylinq/currency/conversions`

**Description:** Get currency conversion audit trail

**Query Parameters:**
```typescript
{
  employeeId?: string;       // Filter by employee
  payrollRunId?: string;     // Filter by payroll run
  fromCurrency?: string;     // Filter by source currency
  toCurrency?: string;       // Filter by target currency
  fromDate?: string;         // Filter by date range start
  toDate?: string;           // Filter by date range end
  page?: number;
  limit?: number;
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversions": [
      {
        "id": "uuid",
        "fromCurrency": "USD",
        "toCurrency": "SRD",
        "fromAmount": 500.00,
        "toAmount": 8925.00,
        "rate": 17.850000,
        "rateSource": "manual",
        "conversionMethod": "automatic",
        "sourceTable": "paycheck",
        "sourceId": "uuid",
        "employee": {
          "id": "uuid",
          "name": "John Doe"
        },
        "payrollRun": {
          "id": "uuid",
          "runNumber": "PR-2025-11-13-001"
        },
        "conversionDate": "2025-11-13",
        "createdAt": "2025-11-13T16:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 250,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## Organization Currency Configuration Endpoints

### 10. Get Organization Currency Config

**Endpoint:** `GET /api/paylinq/settings/currency-config`

**Description:** Get currency configuration for the organization

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "id": "uuid",
      "baseCurrency": "SRD",
      "reportingCurrency": null,
      "supportedCurrencies": ["SRD", "USD", "EUR"],
      "autoUpdateRates": false,
      "rateProvider": null,
      "rateUpdateFrequency": "manual",
      "lastRateUpdate": null,
      "defaultRoundingMethod": "standard",
      "conversionTolerance": 0.0001,
      "requireConversionApproval": false,
      "approvalThresholdAmount": null,
      "updatedAt": "2025-11-01T10:00:00Z"
    }
  }
}
```

---

### 11. Update Organization Currency Config

**Endpoint:** `PUT /api/paylinq/settings/currency-config`

**Description:** Update organization currency configuration

**Request Body:**
```json
{
  "baseCurrency": "SRD",
  "reportingCurrency": "USD",
  "supportedCurrencies": ["SRD", "USD", "EUR", "GBP"],
  "autoUpdateRates": true,
  "rateProvider": "ECB",
  "rateUpdateFrequency": "daily",
  "defaultRoundingMethod": "bankers",
  "conversionTolerance": 0.0002,
  "requireConversionApproval": true,
  "approvalThresholdAmount": 10000.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      // ... updated config
    }
  },
  "message": "Currency configuration updated successfully"
}
```

---

## Enhanced Paycheck Endpoints (Multi-Currency)

### 12. Get Paycheck with Currency Details

**Endpoint:** `GET /api/paylinq/payroll-runs/:runId/paychecks/:paycheckId`

**Description:** Get paycheck with multi-currency breakdown

**Response:**
```json
{
  "success": true,
  "data": {
    "paycheck": {
      "id": "uuid",
      "employeeId": "uuid",
      "employeeName": "John Doe",
      "payPeriodStart": "2025-11-01",
      "payPeriodEnd": "2025-11-30",
      "paymentDate": "2025-12-05",
      
      // Currency information
      "baseCurrency": "SRD",
      "paymentCurrency": "USD",
      
      // Amounts in base currency
      "grossPay": 33875.00,
      "netPay": 25406.25,
      
      // Amounts in payment currency (if different)
      "grossPayInPaymentCurrency": 1900.00,
      "netPayInPaymentCurrency": 1425.00,
      
      // Currency conversion summary
      "currencyConversions": [
        {
          "fromCurrency": "SRD",
          "fromAmount": 25406.25,
          "toCurrency": "USD",
          "toAmount": 1425.00,
          "rate": 17.850000,
          "rateSource": "manual",
          "conversionId": "uuid",
          "timestamp": "2025-12-05T00:00:00Z"
        }
      ],
      "totalConversions": 1,
      
      // Component breakdown
      "components": [
        {
          "componentCode": "BASE_SALARY",
          "componentName": "Base Salary",
          "componentCategory": "earning",
          "amount": 25000.00,
          "componentCurrency": "SRD",
          "paycheckCurrency": "SRD",
          "exchangeRateUsed": null,
          "conversionId": null
        },
        {
          "componentCode": "HOUSING_ALLOWANCE",
          "componentName": "Housing Allowance",
          "componentCategory": "earning",
          "amount": 8925.00,
          "componentCurrency": "USD",
          "componentAmountOriginal": 500.00,
          "paycheckCurrency": "SRD",
          "exchangeRateUsed": 17.850000,
          "conversionId": "uuid"
        }
      ],
      
      // ... rest of paycheck data
    }
  }
}
```

---

## Error Codes

### Currency-Specific Error Codes

```typescript
enum CurrencyErrorCode {
  EXCHANGE_RATE_NOT_FOUND = 'EXCHANGE_RATE_NOT_FOUND',
  INVALID_CURRENCY_CODE = 'INVALID_CURRENCY_CODE',
  CURRENCY_NOT_SUPPORTED = 'CURRENCY_NOT_SUPPORTED',
  RATE_OVERLAP = 'RATE_OVERLAP',
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  CURRENCY_MISMATCH = 'CURRENCY_MISMATCH',
  RATE_EXPIRED = 'RATE_EXPIRED',
  UNSUPPORTED_CURRENCY_PAIR = 'UNSUPPORTED_CURRENCY_PAIR'
}
```

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Exchange rate not found",
  "errorCode": "EXCHANGE_RATE_NOT_FOUND",
  "message": "No exchange rate found for USD → SRD on 2025-11-13",
  "details": {
    "fromCurrency": "USD",
    "toCurrency": "SRD",
    "requestedDate": "2025-11-13"
  }
}
```

---

## Rate Limiting

Apply standard rate limiting per API Standards:
- **General endpoints:** 100 requests per minute
- **Bulk operations:** 10 requests per minute
- **Conversion endpoint:** 200 requests per minute (for UI usage)

---

## Authentication & Authorization

### Required Permissions

```typescript
enum CurrencyPermission {
  // Exchange rates
  VIEW_EXCHANGE_RATES = 'currency:exchange_rates:view',
  CREATE_EXCHANGE_RATES = 'currency:exchange_rates:create',
  UPDATE_EXCHANGE_RATES = 'currency:exchange_rates:update',
  DELETE_EXCHANGE_RATES = 'currency:exchange_rates:delete',
  
  // Conversions
  VIEW_CONVERSIONS = 'currency:conversions:view',
  PERFORM_CONVERSIONS = 'currency:conversions:perform',
  
  // Configuration
  VIEW_CURRENCY_CONFIG = 'currency:config:view',
  UPDATE_CURRENCY_CONFIG = 'currency:config:update'
}
```

### Role-Based Access

```typescript
const rolePermissions = {
  platform_admin: [
    'currency:exchange_rates:*',
    'currency:conversions:*',
    'currency:config:*'
  ],
  payroll_admin: [
    'currency:exchange_rates:view',
    'currency:exchange_rates:create',
    'currency:exchange_rates:update',
    'currency:conversions:view',
    'currency:conversions:perform',
    'currency:config:view'
  ],
  payroll_processor: [
    'currency:exchange_rates:view',
    'currency:conversions:view',
    'currency:conversions:perform'
  ],
  employee: [
    'currency:conversions:view' // Own conversions only
  ]
};
```

---

## API Route Implementation

**File:** `backend/src/products/paylinq/routes/currency.js`

```javascript
import express from 'express';
import { authenticate, authorize } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validation.js';
import * as currencyController from '../controllers/currencyController.js';
import {
  createExchangeRateSchema,
  updateExchangeRateSchema,
  bulkUpdateRatesSchema,
  convertAmountSchema
} from '../validation/currencySchemas.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Exchange rates
router.get('/exchange-rates', 
  authorize('currency:exchange_rates:view'),
  currencyController.getExchangeRates
);

router.get('/exchange-rates/current/:fromCurrency/:toCurrency',
  authorize('currency:exchange_rates:view'),
  currencyController.getCurrentRate
);

router.post('/exchange-rates',
  authorize('currency:exchange_rates:create'),
  validate(createExchangeRateSchema, 'body'),
  currencyController.createExchangeRate
);

router.put('/exchange-rates/:id',
  authorize('currency:exchange_rates:update'),
  validate(updateExchangeRateSchema, 'body'),
  currencyController.updateExchangeRate
);

router.delete('/exchange-rates/:id',
  authorize('currency:exchange_rates:delete'),
  currencyController.deleteExchangeRate
);

router.post('/exchange-rates/bulk',
  authorize('currency:exchange_rates:create'),
  validate(bulkUpdateRatesSchema, 'body'),
  currencyController.bulkUpdateRates
);

router.get('/exchange-rates/:id/history',
  authorize('currency:exchange_rates:view'),
  currencyController.getRateHistory
);

// Conversions
router.post('/currency/convert',
  authorize('currency:conversions:perform'),
  validate(convertAmountSchema, 'body'),
  currencyController.convertAmount
);

router.get('/currency/conversions',
  authorize('currency:conversions:view'),
  currencyController.getConversionHistory
);

// Configuration
router.get('/settings/currency-config',
  authorize('currency:config:view'),
  currencyController.getCurrencyConfig
);

router.put('/settings/currency-config',
  authorize('currency:config:update'),
  currencyController.updateCurrencyConfig
);

export default router;
```

---

## OpenAPI/Swagger Documentation

### Swagger YAML Snippet

```yaml
paths:
  /api/paylinq/exchange-rates:
    get:
      summary: Get exchange rates
      tags: [Currency]
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: fromCurrency
          schema:
            type: string
          description: Filter by source currency
        - in: query
          name: page
          schema:
            type: integer
          description: Page number
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExchangeRateListResponse'
    post:
      summary: Create exchange rate
      tags: [Currency]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateExchangeRateRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExchangeRateResponse'

components:
  schemas:
    ExchangeRate:
      type: object
      properties:
        id:
          type: string
          format: uuid
        fromCurrency:
          type: string
          example: USD
        toCurrency:
          type: string
          example: SRD
        rate:
          type: number
          format: decimal
          example: 17.850000
```

---

**Next Document:** `05-ui-ux-requirements.md` - Frontend components and user experience
