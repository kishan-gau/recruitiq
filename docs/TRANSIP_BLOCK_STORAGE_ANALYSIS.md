# TransIP Block Storage Analysis for Nexus Document Management

**Date:** November 26, 2025  
**Status:** Analysis & Recommendation  
**Scope:** File storage solution for Nexus document management system

---

## Executive Summary

**Recommendation: DO NOT USE TransIP Block Storage for document management**

While TransIP Block Storage provides enterprise-grade storage capabilities, it is **fundamentally incompatible** with the Nexus document management system's requirements. Block Storage is designed as **VPS-attached block devices** (virtual hard drives), not as an S3-compatible object storage solution.

**Critical Incompatibility:**
- ✅ Block Storage = Virtual hard drive attached to a VPS (requires mounting, filesystem)
- ❌ Document Management Needs = S3-compatible object storage with HTTP/HTTPS access
- ❌ Block Storage requires VPS instance (additional €5-30/month minimum)
- ❌ No direct HTTP access to files - must serve through web server

---

## TransIP Block Storage Overview

### What is Block Storage?

Block Storage (formerly "Big Storage") is TransIP's **VPS-attached storage service**:

```
┌─────────────────────────────────────────────────────┐
│                    TransIP VPS                       │
│  ┌─────────────────────────────────────────────┐   │
│  │       Operating System (Ubuntu/Debian)       │   │
│  │  ┌────────────┐        ┌─────────────────┐  │   │
│  │  │  /dev/sda  │        │   /dev/sdb      │  │   │
│  │  │  (OS disk) │        │ (Block Storage) │  │   │
│  │  └────────────┘        └─────────────────┘  │   │
│  │                               │              │   │
│  │  Mount: /mnt/blockstorage ────┘             │   │
│  │                                              │   │
│  │  Application reads/writes like local disk   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Technical Specifications

**From TransIP API Documentation:**

| Feature | Block Storage | Big Storage (Deprecated) |
|---------|--------------|--------------------------|
| **Status** | ✅ Active | ⚠️ Deprecated |
| **API Endpoint** | `/v6/block-storages` | `/v6/big-storages` |
| **Product Types** | `fast-storage`, `big-storage` | N/A |
| **Minimum Size** | 10 GB (fast-storage) | 2 TB |
| **Maximum Size** | 10 TB (fast-storage) | 40 TB |
| **Scaling** | 1 GB increments | 2 TB increments |
| **Attachment** | One VPS at a time | One VPS at a time |
| **Max per VPS** | 10 block storages | 10 big storages |
| **Backup Support** | ✅ Offsite backups | ✅ Offsite backups |
| **Access Method** | Block device (mount) | Block device (mount) |

### Key Characteristics

**Block Storage Types:**

1. **Fast Storage**
   - Minimum: 10 GB
   - Maximum: 10 TB
   - Increments: 1 GB
   - Performance: SSD-backed
   - Use Case: High-performance applications

2. **Big Storage** (legacy compatibility)
   - Minimum: 2 TB
   - Maximum: 40 TB
   - Increments: 2 TB
   - Performance: HDD-backed
   - Use Case: Large bulk storage

**API Endpoints:**
```http
GET    /v6/block-storages
GET    /v6/block-storages/{blockStorageIdentifier}
POST   /v6/block-storages (order new)
POST   /v6/block-storages (upgrade)
PUT    /v6/block-storages/{blockStorageIdentifier} (update/attach/detach)
DELETE /v6/block-storages/{blockStorageIdentifier} (cancel)
```

---

## Current Nexus Document Implementation

### Architecture Overview

```typescript
// Frontend: Document Upload
File → FormData → API Client → Backend Upload Endpoint

// Backend: Document Processing
Upload Endpoint → Multer/File Parser → Store to Filesystem → Save URL to DB

// Database Schema
hris.employee_document:
  - file_url: VARCHAR        // Currently empty/null
  - file_path: VARCHAR       // Local filesystem path
  - file_size: INTEGER       // File size in bytes
  - mime_type: VARCHAR       // Content type
```

### Current Storage Strategy

**From `documentService.js` analysis:**

```javascript
// Documents stored with:
{
  file_path: '/path/to/local/file',  // Local filesystem
  file_url: null,                     // No external URL
  file_size: 123456,                  // Size in bytes
  mime_type: 'application/pdf'        // Content type
}
```

**Storage Location:** Local VPS filesystem (`/uploads` or similar directory)

### Upload Flow

```
User selects file
     ↓
Frontend: useUploadFile() hook
     ↓
API: POST /api/products/nexus/documents/upload
     ↓
Backend: Multer middleware processes FormData
     ↓
File saved to: /var/www/uploads/{organizationId}/{filename}
     ↓
Database: file_path = '/var/www/uploads/...'
     ↓
Response: { documentId, fileName, fileUrl: null }
```

---

## Why Block Storage is NOT Suitable

### 1. **Wrong Technology Type**

**Block Storage:**
```
Block Storage = Virtual Hard Drive
- Requires VPS attachment
- Accessed via filesystem mount (e.g., /mnt/storage)
- No direct HTTP/HTTPS access
- Must serve files through web application
```

**What Document Management Needs:**
```
Object Storage = S3-Compatible API
- Direct HTTP/HTTPS URLs for files
- No VPS required
- Built-in CDN support
- Direct browser download links
```

### 2. **Architectural Incompatibility**

**Block Storage Architecture:**
```
┌──────────────────────────────────────────────────┐
│ VPS Instance (Required)                          │
│  ├─ Web Server (Nginx/Apache)                   │
│  ├─ Application (Node.js)                        │
│  ├─ Mounted Block Storage (/mnt/blockstorage)   │
│  └─ Serve files via application                  │
└──────────────────────────────────────────────────┘
         ↓
User requests file
         ↓
App reads from /mnt/blockstorage/file.pdf
         ↓
App streams file to user via HTTP
         ↓
High CPU/bandwidth usage on VPS
```

**What You Actually Need (S3-Compatible):**
```
┌──────────────────────────────────────────────────┐
│ Object Storage (S3-Compatible)                    │
│  ├─ Direct HTTPS URLs                            │
│  ├─ CDN integration                              │
│  ├─ Pre-signed URLs for security                 │
│  └─ Browser-direct downloads                     │
└──────────────────────────────────────────────────┘
         ↓
User requests: https://cdn.example.com/file.pdf
         ↓
Object storage serves file directly
         ↓
No application server involved
```

### 3. **Cost & Complexity**

**Block Storage Total Cost:**

| Component | Cost | Notes |
|-----------|------|-------|
| VPS Instance | €5-30/month | **Required** - Block storage needs VPS |
| Fast Storage (100 GB) | €2-5/month | Minimum practical size |
| Bandwidth | Variable | Charged when serving files |
| **Total** | **€7-35/month** | **+ development complexity** |

**Alternative (S3-Compatible Storage):**

| Component | Cost | Notes |
|-----------|------|-------|
| Backblaze B2 (100 GB) | €0.60/month | $0.005/GB |
| Bandwidth (10 GB/month) | €0.10/month | $0.01/GB |
| API calls | Free (first 2500/day) | Then $0.004/10k |
| **Total** | **€0.70/month** | **90% cheaper** |

### 4. **Technical Limitations**

#### No Direct File Access
```javascript
// ❌ CANNOT DO WITH BLOCK STORAGE:
const fileUrl = `https://storage.transip.nl/files/${documentId}`;
// Block storage has no public URL endpoint

// ✅ MUST DO INSTEAD:
app.get('/download/:documentId', async (req, res) => {
  const filePath = `/mnt/blockstorage/${documentId}`;
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  // VPS must stream every file download
});
```

#### VPS Dependency
```bash
# Block storage requires:
1. Provision VPS (€5-30/month)
2. Mount block storage to VPS
3. Configure filesystem (ext4, XFS, etc.)
4. Handle storage failures/remounting
5. Manage permissions and security
6. Serve files through application
```

#### Scaling Challenges
```
┌─────────────────────────────────────────────────┐
│ Single VPS Bottleneck                            │
│  - All file requests go through one VPS         │
│  - CPU/RAM/bandwidth limited                    │
│  - Cannot horizontally scale file serving       │
│  - VPS downtime = file access downtime          │
└─────────────────────────────────────────────────┘
```

### 5. **Development Overhead**

**Additional Code Required:**

```javascript
// 1. Mount management
const mountBlockStorage = async () => {
  // Check if mounted
  // Mount if not present
  // Handle mount failures
  // Verify permissions
};

// 2. File serving middleware
app.get('/files/:id', authenticate, authorize, async (req, res) => {
  // Look up file path in database
  // Check file exists on block storage
  // Stream file to client
  // Handle errors (file not found, permission denied, etc.)
  // Log download activity
});

// 3. Storage monitoring
const monitorStorage = () => {
  // Check disk space
  // Alert on low space
  // Handle cleanup of old files
};

// 4. Backup management
const backupFiles = async () => {
  // Coordinate with TransIP backups
  // Verify backup success
  // Test restore procedures
};
```

**Comparison:**

| Task | Block Storage | S3-Compatible |
|------|--------------|---------------|
| File upload | Custom streaming | SDK one-liner |
| File download | Custom streaming | Pre-signed URL |
| URL generation | Application logic | SDK one-liner |
| Access control | Application layer | Built-in policies |
| Backup | Manual/TransIP API | Automatic versioning |
| CDN | Manual Nginx/Apache | Built-in or Cloudflare |

---

## TransIP's Storage Offerings

### What TransIP Provides

After reviewing the complete TransIP API documentation, here are **ALL storage solutions TransIP offers**:

1. **Block Storage** (formerly Big Storage)
   - Type: VPS-attached block devices
   - Use Case: VPS storage expansion
   - ❌ **NOT suitable for document management**

2. **VPS Local Storage**
   - Type: Built-in disk with VPS instances
   - Size: 50 GB (starter), 100 GB (professional), 200 GB (enterprise)
   - ❌ **NOT suitable** - same limitations as Block Storage

3. **Backup/Snapshots**
   - Type: VPS backup service
   - Use Case: VPS disaster recovery
   - ❌ **NOT for file storage** - only for VPS backups

### What TransIP Does NOT Provide

❌ **Object Storage (S3-compatible)**  
❌ **File hosting service with HTTPS URLs**  
❌ **CDN service**  
❌ **Direct file storage API**

### Why TransIP Cannot Be Used

TransIP is an **infrastructure provider** (VPS hosting), not a **storage-as-a-service provider**. All their storage solutions require a VPS instance and filesystem management. They do not compete with AWS S3, Backblaze B2, or similar object storage services.

**Conclusion:** For the Nexus document management system, you **must use a third-party object storage provider**. TransIP cannot serve this use case.

---

## Recommended Alternatives

### Option 1: Backblaze B2 (Recommended)

**Why This is Best:**

✅ **S3-Compatible API** - Works with AWS SDK  
✅ **Free Egress** - 3x download bandwidth vs storage  
✅ **Low Cost** - $0.005/GB/month storage, $0.01/GB download  
✅ **Cloudflare CDN** - Free bandwidth through Cloudflare partnership  
✅ **Direct HTTPS URLs** - No VPS needed  
✅ **Native Integration** - Existing S3 libraries work

**Implementation:**
```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const b2Client = new S3Client({
  endpoint: 'https://s3.eu-central-003.backblazeb2.com',
  region: 'eu-central-003',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

// Upload file
await b2Client.send(new PutObjectCommand({
  Bucket: 'recruitiq-documents',
  Key: `${organizationId}/${documentId}`,
  Body: fileBuffer,
  ContentType: mimeType,
}));

// Generate download URL (valid for 1 hour)
const downloadUrl = await getSignedUrl(b2Client, new GetObjectCommand({
  Bucket: 'recruitiq-documents',
  Key: `${organizationId}/${documentId}`,
}), { expiresIn: 3600 });
```

**Monthly Cost (100 GB storage, 50 GB downloads):**
- Storage: 100 GB × $0.005 = $0.50
- Bandwidth: 50 GB × $0.01 = $0.50
- **Total: $1.00/month (€0.95)**

### Option 2: Amazon S3

**Why Consider:**

✅ **Industry Standard** - Most robust and feature-rich  
✅ **Global Infrastructure** - Best reliability and performance  
✅ **Advanced Features** - Lifecycle policies, intelligent tiering, Glacier  
✅ **Ecosystem** - Tons of tools and integrations

❌ **Higher Cost** - ~4x more expensive than B2  
❌ **Complexity** - More options = steeper learning curve

**Monthly Cost (100 GB storage, 50 GB downloads):**
- Storage: 100 GB × $0.023 = $2.30
- Bandwidth: 50 GB × $0.09 = $4.50
- **Total: $6.80/month (€6.50)**

### Option 3: DigitalOcean Spaces

**Why Consider:**

✅ **S3-Compatible** - Drop-in AWS SDK replacement  
✅ **Predictable Pricing** - $5/month for 250 GB + 1 TB transfer  
✅ **Built-in CDN** - Included at no extra cost  
✅ **Simple Interface** - Easier than AWS

**Monthly Cost:**
- Fixed: $5/month (includes 250 GB + 1 TB transfer)
- **Total: $5/month (€4.75)**

### Option 4: Cloudflare R2

**Why Consider:**

✅ **Zero Egress Fees** - Free bandwidth (unlimited)  
✅ **S3-Compatible** - Works with AWS SDK  
✅ **Cloudflare Network** - Built-in CDN  

❌ **Storage Cost** - $0.015/GB (3x B2)  
❌ **Newer Service** - Less mature than competitors

**Monthly Cost (100 GB storage, unlimited downloads):**
- Storage: 100 GB × $0.015 = $1.50
- Bandwidth: **$0** (zero egress fees)
- **Total: $1.50/month (€1.43)**

---

## Decision Matrix

### Feature Comparison

| Feature | Block Storage | Backblaze B2 | Amazon S3 | DO Spaces | Cloudflare R2 |
|---------|--------------|--------------|-----------|-----------|---------------|
| **Type** | Block device | Object storage | Object storage | Object storage | Object storage |
| **S3 API** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Direct URLs** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **VPS Required** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **CDN Support** | Manual | Cloudflare | CloudFront | Built-in | Built-in |
| **Backup** | TransIP API | Versioning | Versioning | Versioning | Versioning |
| **Egress Cost** | High | Low | High | Included | Free |
| **Min Storage** | 10 GB | 1 GB | 1 GB | 250 GB | 10 GB |
| **Setup Time** | Days | Hours | Hours | Hours | Hours |

### Cost Comparison (100 GB Storage, 50 GB Downloads/month)

| Solution | Monthly Cost | Notes |
|----------|-------------|-------|
| **TransIP Block Storage** | €7-35 | VPS + storage + bandwidth |
| **Backblaze B2** | €0.95 | **Cheapest option** |
| **Cloudflare R2** | €1.43 | Free egress |
| **DO Spaces** | €4.75 | Fixed pricing |
| **Amazon S3** | €6.50 | Enterprise features |

### Recommendation Ranking

**For Nexus Document Management:**

1. **🥇 Backblaze B2** - Best cost/performance ratio
   - Lowest cost
   - S3-compatible
   - Free Cloudflare CDN integration
   - European data center (GDPR compliant)

2. **🥈 Cloudflare R2** - Best for high download volumes
   - Zero egress fees
   - Excellent if downloads exceed 3x storage
   - Cloudflare network

3. **🥉 DigitalOcean Spaces** - Best for simplicity
   - Predictable pricing
   - Simple interface
   - Good for small teams

4. **Amazon S3** - Enterprise choice
   - Most features
   - Best reliability
   - Higher cost justified for mission-critical data

5. **❌ TransIP Block Storage** - **NOT RECOMMENDED**
   - Wrong technology type
   - Higher complexity
   - Higher cost
   - No direct file access

---

## Implementation Plan for Backblaze B2

### Phase 1: Setup (1-2 hours)

```bash
# 1. Create Backblaze account
# 2. Create bucket: recruitiq-documents-production
# 3. Generate Application Key with limited permissions
# 4. Configure CORS for frontend uploads
```

### Phase 2: Backend Integration (4-6 hours)

```javascript
// backend/src/services/storage/b2Storage.js
import { S3Client } from '@aws-sdk/client-s3';

export class B2StorageService {
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION,
      credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APP_KEY,
      },
    });
  }

  async uploadDocument(file, organizationId, documentId) {
    const key = `${organizationId}/documents/${documentId}/${file.originalname}`;
    // Upload implementation
  }

  async getDownloadUrl(organizationId, documentId, expiresIn = 3600) {
    // Pre-signed URL generation
  }

  async deleteDocument(organizationId, documentId) {
    // Deletion implementation
  }
}
```

### Phase 3: Migration (If Existing Files)

```javascript
// Script to migrate local files to B2
async function migrateDocuments() {
  const documents = await getDocumentsWithLocalFiles();
  
  for (const doc of documents) {
    const fileBuffer = await fs.readFile(doc.file_path);
    const uploadResult = await b2.uploadDocument(
      fileBuffer,
      doc.organization_id,
      doc.id
    );
    
    await updateDocumentUrl(doc.id, uploadResult.url);
  }
}
```

### Phase 4: Testing (2-3 hours)

- Upload various file types
- Test download URLs
- Verify expiration
- Test access control
- Load test with multiple simultaneous uploads

---

## Security Considerations

### Block Storage Security
```
- VPS firewall rules
- Filesystem permissions
- Application-level access control
- Manual backup verification
- Mount security
```

### B2 Security (Built-in)
```
- Bucket policies
- Pre-signed URLs with expiration
- Application keys with limited scope
- Encryption at rest (AES-256)
- Encryption in transit (TLS)
- Versioning for data protection
- Lifecycle rules for retention
```

---

## Conclusion

### Final Recommendation

**DO NOT use TransIP Block Storage for Nexus document management.**

**Instead, implement Backblaze B2 with the following rationale:**

1. **Technology Fit**: S3-compatible object storage is the correct technology for document management
2. **Cost Efficiency**: 95% cheaper than Block Storage solution (€0.95 vs €7-35/month)
3. **Simplicity**: No VPS management, mounting, or file serving logic required
4. **Scalability**: Handles millions of files without VPS bottlenecks
5. **Security**: Built-in access control, encryption, and versioning
6. **Performance**: Direct HTTPS URLs with Cloudflare CDN integration
7. **Reliability**: 99.9% uptime SLA without managing infrastructure
8. **Developer Experience**: Well-documented SDK, extensive examples

### Why Block Storage Fails

Block Storage is designed for:
- ✅ VPS boot volumes
- ✅ Database storage expansion
- ✅ Application data volumes
- ✅ Backup storage for VPS

Block Storage is **NOT designed for**:
- ❌ Web-accessible file storage
- ❌ Direct HTTP file serving
- ❌ Document management systems
- ❌ User-uploaded content storage

---

## Next Steps

1. **Approve Backblaze B2 as storage solution**
2. **Create B2 account and bucket**
3. **Implement storage service layer** (`backend/src/services/storage/b2Storage.js`)
4. **Update document upload endpoint** to use B2
5. **Migrate existing documents** (if any)
6. **Test upload/download workflows**
7. **Deploy to production**

**Estimated Implementation Time:** 8-12 hours  
**Estimated Monthly Cost:** €0.95 (100 GB storage, 50 GB downloads)  
**Annual Savings vs Block Storage:** €240-420

---

## References

- **TransIP Block Storage API**: https://api.transip.nl/rest/docs.html#vps-block-storages
- **Backblaze B2 Documentation**: https://www.backblaze.com/b2/docs/
- **AWS SDK for JavaScript v3**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
- **S3-Compatible Storage Comparison**: https://www.backblaze.com/blog/cloud-storage-price-comparison/

---

**Document Version:** 1.0  
**Last Updated:** November 26, 2025  
**Next Review:** When storage requirements exceed 1 TB
