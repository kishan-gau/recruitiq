# Content Negotiation Implementation Plan

**Priority:** Low  
**Effort:** 2 days  
**Impact:** Multiple response formats (JSON, XML, CSV), better client flexibility  
**Phase:** 3 (Advanced)

---

## Overview

Implement HTTP content negotiation to support multiple response formats (JSON, XML, CSV) based on the `Accept` header, enabling clients to request data in their preferred format.

### Business Value

- **Client Flexibility:** Support diverse client requirements
- **Data Export:** Easy CSV/XML export without custom endpoints
- **Standards Compliance:** Proper REST content negotiation
- **Integration Support:** Easier third-party integrations (XML for legacy systems)
- **Reduced Endpoints:** One endpoint serves multiple formats

---

## Current State

**Status:** Only JSON supported  
**Gap:** No content negotiation, clients cannot request alternative formats

**Current Problem:**
```javascript
// Only JSON available
GET /api/v1/jobs
Accept: application/json

// Response is always JSON
{
  "success": true,
  "jobs": [...]
}

// Clients need custom export endpoints for CSV
GET /api/v1/jobs/export/csv  // ❌ Unnecessary custom endpoint
```

**Desired with Content Negotiation:**
```javascript
// JSON (default)
GET /api/v1/jobs
Accept: application/json

{
  "success": true,
  "jobs": [...]
}

// CSV
GET /api/v1/jobs
Accept: text/csv

id,title,status,created_at
123,Senior Developer,open,2025-11-16T10:00:00Z
456,Product Manager,closed,2025-11-15T14:30:00Z

// XML
GET /api/v1/jobs
Accept: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<response>
  <success>true</success>
  <jobs>
    <job>
      <id>123</id>
      <title>Senior Developer</title>
    </job>
  </jobs>
</response>
```

---

## Technical Implementation

### 1. Content Negotiation Middleware

**File:** `backend/src/middleware/contentNegotiation.js`

```javascript
import logger from '../utils/logger.js';
import { UnsupportedMediaTypeError } from '../utils/errors.js';

/**
 * Supported MIME types
 */
const SUPPORTED_TYPES = {
  'application/json': 'json',
  'text/csv': 'csv',
  'application/xml': 'xml',
  'text/xml': 'xml'
};

/**
 * Content negotiation middleware
 */
export function contentNegotiation(config = {}) {
  const {
    supportedTypes = SUPPORTED_TYPES,
    defaultType = 'application/json'
  } = config;

  return (req, res, next) => {
    // Parse Accept header
    const acceptHeader = req.get('Accept') || defaultType;
    
    // Handle wildcard
    if (acceptHeader === '*/*' || acceptHeader === '') {
      req.acceptedFormat = supportedTypes[defaultType];
      req.acceptedMimeType = defaultType;
      return next();
    }

    // Find matching supported type
    const acceptedTypes = parseAcceptHeader(acceptHeader);
    
    for (const type of acceptedTypes) {
      if (supportedTypes[type.mime]) {
        req.acceptedFormat = supportedTypes[type.mime];
        req.acceptedMimeType = type.mime;
        return next();
      }
    }

    // No acceptable format found
    return next(new UnsupportedMediaTypeError(
      `Supported formats: ${Object.keys(supportedTypes).join(', ')}`
    ));
  };
}

/**
 * Parse Accept header with quality values
 */
function parseAcceptHeader(header) {
  return header
    .split(',')
    .map(type => {
      const [mime, ...params] = type.trim().split(';');
      const quality = params
        .find(p => p.trim().startsWith('q='))
        ?.split('=')[1] || '1';
      
      return {
        mime: mime.trim(),
        quality: parseFloat(quality)
      };
    })
    .sort((a, b) => b.quality - a.quality);
}

/**
 * Response formatter middleware
 * Formats response based on accepted format
 */
export function formatResponse() {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method
    res.json = function(body) {
      const format = req.acceptedFormat || 'json';
      const mimeType = req.acceptedMimeType || 'application/json';

      // Set content type
      res.type(mimeType);

      switch (format) {
        case 'json':
          return originalJson.call(this, body);
        
        case 'csv':
          return this.send(formatAsCSV(body));
        
        case 'xml':
          return this.send(formatAsXML(body));
        
        default:
          return originalJson.call(this, body);
      }
    };

    next();
  };
}

/**
 * Format response as CSV
 */
function formatAsCSV(data) {
  // Handle collection
  if (data.success && Array.isArray(data[Object.keys(data).find(k => Array.isArray(data[k]))])) {
    const collectionKey = Object.keys(data).find(k => Array.isArray(data[k]));
    const items = data[collectionKey];
    
    if (items.length === 0) {
      return '';
    }

    // Get headers from first item
    const headers = Object.keys(items[0]).filter(k => k !== '_links');
    const csvHeaders = headers.join(',');
    
    // Format rows
    const csvRows = items.map(item => {
      return headers.map(header => {
        const value = item[header];
        
        // Handle different types
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    }).join('\n');
    
    return `${csvHeaders}\n${csvRows}`;
  }

  // Handle single resource
  const resourceKey = Object.keys(data).find(k => typeof data[k] === 'object' && k !== '_links');
  if (resourceKey) {
    const item = data[resourceKey];
    const headers = Object.keys(item).filter(k => k !== '_links');
    const csvHeaders = headers.join(',');
    
    const csvRow = headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
    
    return `${csvHeaders}\n${csvRow}`;
  }

  return '';
}

/**
 * Format response as XML
 */
function formatAsXML(data) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<response>\n';
  xml += objectToXML(data, '  ');
  xml += '</response>';
  
  return xml;
}

/**
 * Convert object to XML recursively
 */
function objectToXML(obj, indent = '') {
  let xml = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_links') continue; // Skip HATEOAS links in XML
    
    if (value === null || value === undefined) {
      xml += `${indent}<${key}/>\n`;
    } else if (Array.isArray(value)) {
      xml += `${indent}<${key}>\n`;
      value.forEach(item => {
        const singularKey = key.endsWith('s') ? key.slice(0, -1) : 'item';
        xml += `${indent}  <${singularKey}>\n`;
        xml += objectToXML(item, indent + '    ');
        xml += `${indent}  </${singularKey}>\n`;
      });
      xml += `${indent}</${key}>\n`;
    } else if (typeof value === 'object') {
      xml += `${indent}<${key}>\n`;
      xml += objectToXML(value, indent + '  ');
      xml += `${indent}</${key}>\n`;
    } else {
      const escapedValue = escapeXML(String(value));
      xml += `${indent}<${key}>${escapedValue}</${key}>\n`;
    }
  }
  
  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default {
  contentNegotiation,
  formatResponse
};
```

### 2. Apply Middleware

**File:** `backend/src/server.js`

```javascript
import { contentNegotiation, formatResponse } from './middleware/contentNegotiation.js';

// Apply content negotiation globally
app.use(contentNegotiation({
  supportedTypes: {
    'application/json': 'json',
    'text/csv': 'csv',
    'application/xml': 'xml',
    'text/xml': 'xml'
  },
  defaultType: 'application/json'
}));

app.use(formatResponse());

// Routes now automatically support all formats
app.use('/api/v1', routes);
```

### 3. Format-Specific Serializers

**File:** `backend/src/utils/serializers/csvSerializer.js`

```javascript
/**
 * Advanced CSV serializer with options
 */
export class CSVSerializer {
  constructor(options = {}) {
    this.delimiter = options.delimiter || ',';
    this.quote = options.quote || '"';
    this.lineBreak = options.lineBreak || '\n';
    this.includeHeaders = options.includeHeaders !== false;
    this.flattenObjects = options.flattenObjects !== false;
  }

  /**
   * Serialize data to CSV
   */
  serialize(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const flattened = this.flattenObjects 
      ? data.map(item => this.flattenObject(item))
      : data;

    const headers = this.extractHeaders(flattened);
    const rows = flattened.map(item => this.serializeRow(item, headers));

    if (this.includeHeaders) {
      rows.unshift(headers.join(this.delimiter));
    }

    return rows.join(this.lineBreak);
  }

  /**
   * Flatten nested objects
   */
  flattenObject(obj, prefix = '') {
    const flattened = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key === '_links') continue;

      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Extract headers from data
   */
  extractHeaders(data) {
    const headers = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => headers.add(key));
    });
    return Array.from(headers);
  }

  /**
   * Serialize single row
   */
  serializeRow(item, headers) {
    return headers.map(header => {
      const value = item[header];
      return this.escapeValue(value);
    }).join(this.delimiter);
  }

  /**
   * Escape CSV value
   */
  escapeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    if (str.includes(this.delimiter) || 
        str.includes(this.quote) || 
        str.includes('\n')) {
      return `${this.quote}${str.replace(new RegExp(this.quote, 'g'), this.quote + this.quote)}${this.quote}`;
    }

    return str;
  }
}

export default CSVSerializer;
```

**File:** `backend/src/utils/serializers/xmlSerializer.js`

```javascript
/**
 * Advanced XML serializer
 */
export class XMLSerializer {
  constructor(options = {}) {
    this.rootElement = options.rootElement || 'response';
    this.itemElement = options.itemElement || 'item';
    this.declaration = options.declaration !== false;
    this.pretty = options.pretty !== false;
    this.indent = options.indent || '  ';
  }

  /**
   * Serialize data to XML
   */
  serialize(data) {
    let xml = '';

    if (this.declaration) {
      xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
    }

    xml += `<${this.rootElement}>\n`;
    xml += this.serializeValue(data, this.indent);
    xml += `</${this.rootElement}>`;

    return xml;
  }

  /**
   * Serialize value recursively
   */
  serializeValue(value, indent) {
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      return this.serializeObject(value, indent);
    }
    return '';
  }

  /**
   * Serialize object
   */
  serializeObject(obj, indent) {
    let xml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (key === '_links') continue;

      if (value === null || value === undefined) {
        xml += `${indent}<${key}/>\n`;
      } else if (Array.isArray(value)) {
        xml += this.serializeArray(key, value, indent);
      } else if (typeof value === 'object') {
        xml += `${indent}<${key}>\n`;
        xml += this.serializeObject(value, indent + this.indent);
        xml += `${indent}</${key}>\n`;
      } else {
        xml += `${indent}<${key}>${this.escape(String(value))}</${key}>\n`;
      }
    }

    return xml;
  }

  /**
   * Serialize array
   */
  serializeArray(key, array, indent) {
    let xml = `${indent}<${key}>\n`;

    const singularKey = this.singularize(key);

    array.forEach(item => {
      if (typeof item === 'object') {
        xml += `${indent}${this.indent}<${singularKey}>\n`;
        xml += this.serializeObject(item, indent + this.indent + this.indent);
        xml += `${indent}${this.indent}</${singularKey}>\n`;
      } else {
        xml += `${indent}${this.indent}<${singularKey}>${this.escape(String(item))}</${singularKey}>\n`;
      }
    });

    xml += `${indent}</${key}>\n`;
    return xml;
  }

  /**
   * Simple singularization
   */
  singularize(word) {
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    }
    if (word.endsWith('s')) {
      return word.slice(0, -1);
    }
    return this.itemElement;
  }

  /**
   * Escape XML special characters
   */
  escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default XMLSerializer;
```

### 4. Advanced Format Options

**File:** `backend/src/middleware/formatOptions.js`

```javascript
/**
 * Parse format-specific options from query params
 */
export function parseFormatOptions(req, res, next) {
  const format = req.acceptedFormat;

  if (format === 'csv') {
    req.formatOptions = {
      delimiter: req.query.delimiter || ',',
      includeHeaders: req.query.headers !== 'false',
      flattenObjects: req.query.flatten !== 'false'
    };
  } else if (format === 'xml') {
    req.formatOptions = {
      rootElement: req.query.root || 'response',
      pretty: req.query.pretty !== 'false'
    };
  }

  next();
}

// Usage
router.get('/jobs', 
  contentNegotiation(),
  parseFormatOptions,
  formatResponse(),
  jobController.listJobs
);

// Request examples:
// CSV with semicolon delimiter:
// GET /api/v1/jobs?delimiter=;
// Accept: text/csv

// XML with custom root:
// GET /api/v1/jobs?root=jobs_response
// Accept: application/xml
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/middleware/contentNegotiation.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import { formatAsCSV, formatAsXML } from '../../src/middleware/contentNegotiation.js';

describe('Content Negotiation', () => {
  describe('CSV Formatting', () => {
    it('should format collection as CSV', () => {
      const data = {
        success: true,
        jobs: [
          { id: '1', title: 'Developer', status: 'open' },
          { id: '2', title: 'Manager', status: 'closed' }
        ]
      };

      const csv = formatAsCSV(data);

      expect(csv).toContain('id,title,status');
      expect(csv).toContain('1,Developer,open');
      expect(csv).toContain('2,Manager,closed');
    });

    it('should escape CSV special characters', () => {
      const data = {
        success: true,
        jobs: [
          { id: '1', title: 'Developer, Senior', status: 'open' }
        ]
      };

      const csv = formatAsCSV(data);

      expect(csv).toContain('"Developer, Senior"');
    });
  });

  describe('XML Formatting', () => {
    it('should format collection as XML', () => {
      const data = {
        success: true,
        jobs: [
          { id: '1', title: 'Developer' }
        ]
      };

      const xml = formatAsXML(data);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<response>');
      expect(xml).toContain('<jobs>');
      expect(xml).toContain('<job>');
      expect(xml).toContain('<id>1</id>');
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/contentNegotiation.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('Content Negotiation Integration', () => {
  let authToken;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });

  it('should return JSON by default', async () => {
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('jobs');
  });

  it('should return CSV when requested', async () => {
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Accept', 'text/csv')
      .expect(200)
      .expect('Content-Type', /csv/);

    expect(response.text).toContain('id,title');
  });

  it('should return XML when requested', async () => {
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Accept', 'application/xml')
      .expect(200)
      .expect('Content-Type', /xml/);

    expect(response.text).toContain('<?xml');
    expect(response.text).toContain('<response>');
  });

  it('should respect quality values', async () => {
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Accept', 'text/csv;q=0.9, application/json;q=1.0')
      .expect(200)
      .expect('Content-Type', /json/);
  });
});
```

---

## Client SDK Support

**File:** `packages/api-client/src/client.js`

```javascript
class APIClient {
  /**
   * Request data in specific format
   */
  async getAs(url, format = 'json') {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml'
    };

    const response = await this.axios.get(url, {
      headers: {
        'Accept': mimeTypes[format] || mimeTypes.json
      },
      responseType: format === 'json' ? 'json' : 'text'
    });

    return response.data;
  }

  /**
   * Download as CSV
   */
  async downloadCSV(url, filename) {
    const csv = await this.getAs(url, 'csv');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'export.csv';
    link.click();
  }
}

// Usage
const jobs = await client.getAs('/jobs', 'json');     // JSON
const csv = await client.getAs('/jobs', 'csv');       // CSV
const xml = await client.getAs('/jobs', 'xml');       // XML

// Download CSV
await client.downloadCSV('/jobs', 'jobs-export.csv');
```

---

## Frontend Integration

**File:** `apps/portal/src/components/ExportButton.jsx`

```jsx
import React from 'react';
import { Button } from '@recruitiq/ui';
import { apiClient } from '@recruitiq/api-client';

function ExportButton({ resource, format = 'csv' }) {
  const handleExport = async () => {
    const filename = `${resource}-export-${Date.now()}.${format}`;
    
    await apiClient.downloadCSV(
      `/api/v1/${resource}`,
      filename
    );
  };

  return (
    <Button onClick={handleExport} variant="secondary">
      Export as {format.toUpperCase()}
    </Button>
  );
}

// Usage
function JobsList() {
  return (
    <div>
      <h1>Jobs</h1>
      <ExportButton resource="jobs" format="csv" />
    </div>
  );
}
```

---

## Rollout Plan

### Day 1: Core Implementation
- [x] Create content negotiation middleware
- [x] Add CSV formatter
- [x] Add XML formatter
- [x] Write unit tests

### Day 2: Integration & Deployment
- [ ] Apply middleware globally
- [ ] Test with all endpoints
- [ ] Update client SDK
- [ ] Add export buttons to UI
- [ ] Update documentation
- [ ] Deploy to production

---

## Success Criteria

- ✅ All endpoints support JSON, CSV, XML
- ✅ Proper Accept header negotiation
- ✅ CSV exports work correctly
- ✅ XML format is valid
- ✅ Quality values respected
- ✅ Client SDK supports all formats

---

## Documentation

Add to `docs/API_STANDARDS.md`:

````markdown
## Content Negotiation

Request data in different formats using the `Accept` header.

### Supported Formats

- `application/json` (default)
- `text/csv`
- `application/xml`

### JSON (Default)

```http
GET /api/v1/jobs
Accept: application/json

{
  "success": true,
  "jobs": [...]
}
```

### CSV Export

```http
GET /api/v1/jobs
Accept: text/csv

id,title,status,created_at
123,Developer,open,2025-11-16T10:00:00Z
```

### XML Export

```http
GET /api/v1/jobs
Accept: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<response>
  <jobs>
    <job>
      <id>123</id>
      <title>Developer</title>
    </job>
  </jobs>
</response>
```

### Format Options

CSV options via query parameters:
- `delimiter` - Column delimiter (default: `,`)
- `headers` - Include headers (default: `true`)
- `flatten` - Flatten nested objects (default: `true`)

```http
GET /api/v1/jobs?delimiter=;&headers=true
Accept: text/csv
```
````

---

## References

- [RFC 7231 - Content Negotiation](https://tools.ietf.org/html/rfc7231#section-5.3)
- [MDN - Accept Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept)
- [CSV RFC 4180](https://tools.ietf.org/html/rfc4180)
