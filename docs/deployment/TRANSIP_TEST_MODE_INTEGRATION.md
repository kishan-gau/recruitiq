# TransIP Test Mode Integration for Portal CI/CD Features

**Date:** November 27, 2025  
**Status:** Implementation Plan  
**Scope:** Safe testing of VPS provisioning and CI/CD features using TransIP's test mode

---

## Executive Summary

TransIP provides a **test mode** that allows safe API testing without actually creating resources or incurring charges. By appending `?test=1` to any API endpoint, TransIP simulates the operation without executing it. This is perfect for testing the Portal's VPS provisioning and CI/CD features in a development environment.

**Key Benefits:**
- ✅ **Zero Risk** - No actual VPS creation or charges
- ✅ **Full API Testing** - All endpoints work in test mode
- ✅ **Realistic Responses** - API returns valid data structures
- ✅ **Development Safety** - Cannot accidentally create production resources
- ✅ **Cost-Free Testing** - Test unlimited times without billing

---

## Table of Contents

1. [TransIP Test Mode Overview](#transip-test-mode-overview)
2. [Features Available in Test Mode](#features-available-in-test-mode)
3. [Implementation Plan](#implementation-plan)
4. [VPS Management Features](#vps-management-features)
5. [CI/CD Integration Features](#cicd-integration-features)
6. [Portal UI Integration](#portal-ui-integration)
7. [Testing Strategy](#testing-strategy)
8. [Security Considerations](#security-considerations)
9. [Production Deployment Plan](#production-deployment-plan)

---

## TransIP Test Mode Overview

### How Test Mode Works

**From TransIP API Documentation:**

> By providing the `test` parameter on any of your requests you can use test mode while authenticated as your own user. When you request a `DELETE` on a VPS with the URL `/v6/vps/test-vps2?test=1`, the actual delete is skipped. The same goes for any other type of modification.

### Test Mode Behavior

| API Call | Without Test Mode | With Test Mode (`?test=1`) |
|----------|------------------|---------------------------|
| `POST /vps` | ✅ Creates real VPS, charges account | ✅ Returns success, but no VPS created |
| `DELETE /vps/example` | ✅ Deletes VPS | ✅ Returns success, VPS unchanged |
| `PUT /vps/example` | ✅ Updates VPS | ✅ Returns success, no changes |
| `POST /vps/example/snapshots` | ✅ Creates snapshot | ✅ Returns success, no snapshot |
| `GET /vps` | ✅ Returns real data | ✅ Returns real data (read-only) |

### Key Characteristics

```javascript
// Test mode is URL-based
const testModeUrl = 'https://api.transip.nl/v6/vps?test=1';
const productionUrl = 'https://api.transip.nl/v6/vps';

// Responses are identical in structure
const testResponse = {
  vps: {
    name: 'vps-example-123',
    status: 'running',
    ipAddress: '37.97.254.6',
    // ... same structure as real VPS
  }
};

// But no actual resource is created/modified
// Your TransIP account remains unchanged
```

---

## Features Available in Test Mode

### VPS Lifecycle Management

#### 1. VPS Creation
```http
POST /v6/vps?test=1
Content-Type: application/json

{
  "productName": "vps-bladevps-x4",
  "description": "Test VPS for acmecorp",
  "operatingSystem": "ubuntu-22.04",
  "hostname": "acmecorp.recruitiq.nl",
  "availabilityZone": "ams0"
}
```

**Test Mode Response:**
```json
{
  "success": true,
  "vps": {
    "name": "vps-acmecorp-123456",
    "status": "running",
    "ipAddress": "203.0.113.42",
    "hostname": "acmecorp.recruitiq.nl"
  }
}
```

**Reality:** No VPS created, no charges, but response is realistic.

#### 2. VPS Operations

| Operation | Endpoint | Test Mode Behavior |
|-----------|----------|-------------------|
| **Start** | `PATCH /vps/{name}?test=1` | Returns success, VPS unchanged |
| **Stop** | `PATCH /vps/{name}?test=1` | Returns success, VPS unchanged |
| **Reboot** | `PATCH /vps/{name}?test=1` | Returns success, VPS unchanged |
| **Reset** | `PATCH /vps/{name}?test=1` | Returns success, VPS unchanged |
| **Upgrade** | `POST /vps/{name}/upgrade?test=1` | Returns success, no upgrade |
| **Clone** | `POST /vps?test=1` | Returns success, no clone created |
| **Delete** | `DELETE /vps/{name}?test=1` | Returns success, VPS unchanged |

#### 3. Snapshot Management

```http
POST /v6/vps/example-vps/snapshots?test=1
{
  "description": "Before deployment - 2025-11-27",
  "shouldStartVps": true
}
```

**Test Mode:** Returns success with snapshot ID, but no actual snapshot created.

#### 4. IP Address Management

```http
# Add IPv6 address
POST /v6/vps/example-vps/ip-addresses?test=1
{
  "ipAddress": "2a01:7c8:3:1337::6"
}

# Update reverse DNS
PUT /v6/vps/example-vps/ip-addresses/37.97.254.6?test=1
{
  "ipAddress": {
    "reverseDns": "acmecorp.recruitiq.nl"
  }
}

# Remove IP
DELETE /v6/vps/example-vps/ip-addresses/2a01:7c8:3:1337::6?test=1
```

**Test Mode:** All operations return success, but no changes occur.

### Firewall Configuration

```http
PUT /v6/vps/example-vps/firewall?test=1
{
  "vpsFirewall": {
    "isEnabled": true,
    "ruleSet": [
      {
        "description": "HTTPS",
        "startPort": 443,
        "endPort": 443,
        "protocol": "tcp",
        "whitelist": ["0.0.0.0/0"]
      }
    ]
  }
}
```

**Test Mode:** Returns success, firewall configuration simulated.

### VPS Settings

```http
PUT /v6/vps/example-vps/settings/blockVpsMailPorts?test=1
{
  "setting": {
    "name": "blockVpsMailPorts",
    "value": {
      "valueBoolean": false
    }
  }
}
```

**Test Mode:** Returns success, setting unchanged.

### TCP Monitoring

```http
POST /v6/vps/example-vps/tcp-monitors?test=1
{
  "tcpMonitor": {
    "ipAddress": "37.97.254.6",
    "label": "HTTPS Monitor",
    "ports": [443],
    "interval": 5,
    "allowedTimeouts": 2
  }
}
```

**Test Mode:** Returns success with monitor ID, but no actual monitor created.

### Addons

```http
POST /v6/vps/example-vps/addons?test=1
{
  "addons": ["vps-addon-1-extra-ip-address"]
}
```

**Test Mode:** Returns success, no addon purchased.

### Private Networks

```http
POST /v6/private-networks?test=1
{
  "privateNetwork": {
    "name": "recruitiq-internal",
    "description": "Internal network for multi-tenant VPS"
  }
}
```

**Test Mode:** Returns success with network details, no network created.

---

## Implementation Plan

### Phase 1: TransIP Client with Test Mode Support

**File:** `backend/src/services/transip/TransIPClient.js`

```javascript
import TransIP from 'transip';
import logger from '../utils/logger.js';

/**
 * TransIP API client with test mode support
 */
class TransIPClient {
  constructor() {
    this.client = new TransIP({
      login: process.env.TRANSIP_USERNAME,
      privateKey: process.env.TRANSIP_PRIVATE_KEY,
      readOnly: false,
    });

    // Determine test mode based on environment
    this.isTestMode = process.env.NODE_ENV !== 'production';
    
    logger.info('TransIP Client initialized', {
      testMode: this.isTestMode,
      environment: process.env.NODE_ENV
    });
  }

  /**
   * Append test parameter to URL if in test mode
   */
  _addTestParam(url) {
    if (!this.isTestMode) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}test=1`;
  }

  /**
   * Make API request with test mode support
   */
  async _request(method, endpoint, data = null) {
    const url = this._addTestParam(endpoint);
    
    logger.debug('TransIP API Request', {
      method,
      endpoint,
      testMode: this.isTestMode,
      finalUrl: url
    });

    try {
      const response = await this.client.api.request({
        method,
        url,
        data
      });

      logger.debug('TransIP API Response', {
        method,
        endpoint,
        testMode: this.isTestMode,
        statusCode: response.status
      });

      return response.data;
    } catch (error) {
      logger.error('TransIP API Error', {
        method,
        endpoint,
        testMode: this.isTestMode,
        error: error.message,
        statusCode: error.response?.status
      });
      throw error;
    }
  }

  /**
   * VPS Management Methods
   */
  
  async listVPS() {
    return this._request('GET', '/v6/vps');
  }

  async getVPS(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}`);
  }

  async createVPS(config) {
    logger.info('Creating VPS', {
      testMode: this.isTestMode,
      config: {
        productName: config.productName,
        description: config.description,
        hostname: config.hostname
      }
    });

    return this._request('POST', '/v6/vps', config);
  }

  async deleteVPS(vpsName) {
    logger.warn('Deleting VPS', {
      testMode: this.isTestMode,
      vpsName
    });

    return this._request('DELETE', `/v6/vps/${vpsName}`);
  }

  async startVPS(vpsName) {
    return this._request('PATCH', `/v6/vps/${vpsName}`, {
      action: 'start'
    });
  }

  async stopVPS(vpsName) {
    return this._request('PATCH', `/v6/vps/${vpsName}`, {
      action: 'stop'
    });
  }

  async rebootVPS(vpsName) {
    return this._request('PATCH', `/v6/vps/${vpsName}`, {
      action: 'reset'
    });
  }

  /**
   * Snapshot Management
   */
  
  async createSnapshot(vpsName, description) {
    logger.info('Creating VPS snapshot', {
      testMode: this.isTestMode,
      vpsName,
      description
    });

    return this._request('POST', `/v6/vps/${vpsName}/snapshots`, {
      description,
      shouldStartVps: true
    });
  }

  async listSnapshots(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}/snapshots`);
  }

  async deleteSnapshot(vpsName, snapshotId) {
    return this._request('DELETE', `/v6/vps/${vpsName}/snapshots/${snapshotId}`);
  }

  async revertToSnapshot(vpsName, snapshotId) {
    return this._request('PATCH', `/v6/vps/${vpsName}/snapshots/${snapshotId}`, {
      action: 'revert'
    });
  }

  /**
   * Firewall Management
   */
  
  async getFirewall(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}/firewall`);
  }

  async updateFirewall(vpsName, firewallConfig) {
    logger.info('Updating VPS firewall', {
      testMode: this.isTestMode,
      vpsName,
      rulesCount: firewallConfig.ruleSet?.length || 0
    });

    return this._request('PUT', `/v6/vps/${vpsName}/firewall`, {
      vpsFirewall: firewallConfig
    });
  }

  /**
   * IP Address Management
   */
  
  async listIPAddresses(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}/ip-addresses`);
  }

  async addIPv6(vpsName, ipAddress) {
    return this._request('POST', `/v6/vps/${vpsName}/ip-addresses`, {
      ipAddress
    });
  }

  async updateReverseDNS(vpsName, ipAddress, reverseDns) {
    return this._request('PUT', `/v6/vps/${vpsName}/ip-addresses/${ipAddress}`, {
      ipAddress: {
        address: ipAddress,
        reverseDns
      }
    });
  }

  /**
   * Usage Statistics
   */
  
  async getUsageStats(vpsName, types = 'cpu,disk,network') {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - (24 * 60 * 60);

    return this._request('GET', `/v6/vps/${vpsName}/usage`, {
      types,
      dateTimeStart: dayAgo,
      dateTimeEnd: now
    });
  }

  /**
   * Test mode helpers
   */
  
  isInTestMode() {
    return this.isTestMode;
  }

  getTestModeStatus() {
    return {
      enabled: this.isTestMode,
      environment: process.env.NODE_ENV,
      warning: this.isTestMode 
        ? 'Test mode enabled - no real resources will be created' 
        : 'PRODUCTION MODE - real resources will be created and charged'
    };
  }
}

export default new TransIPClient();
```

### Phase 2: VPS Service Layer

**File:** `backend/src/services/transip/VPSService.js`

```javascript
import transipClient from './TransIPClient.js';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * VPS management service for Portal
 */
class VPSService {
  /**
   * Get VPS tier specifications
   */
  getVPSTierSpecs(tier) {
    const specs = {
      starter: {
        productName: 'vps-bladevps-x2',
        description: 'Starter VPS - 1 CPU, 2GB RAM, 50GB Disk',
        cpus: 1,
        memory: 2048,
        disk: 50,
        addons: []
      },
      professional: {
        productName: 'vps-bladevps-x4',
        description: 'Professional VPS - 2 CPUs, 4GB RAM, 100GB Disk',
        cpus: 2,
        memory: 4096,
        disk: 100,
        addons: ['vps-addon-100-gb-disk']
      },
      enterprise: {
        productName: 'vps-bladevps-x8',
        description: 'Enterprise VPS - 4 CPUs, 8GB RAM, 200GB Disk',
        cpus: 4,
        memory: 8192,
        disk: 200,
        addons: ['vps-addon-200-gb-disk']
      }
    };

    if (!specs[tier]) {
      throw new ValidationError(`Invalid tier: ${tier}. Must be starter, professional, or enterprise`);
    }

    return specs[tier];
  }

  /**
   * Create VPS for organization
   */
  async createVPS(organizationId, slug, tier = 'professional') {
    logger.info('VPS creation requested', {
      organizationId,
      slug,
      tier,
      testMode: transipClient.isInTestMode()
    });

    // Validate inputs
    if (!slug || slug.length < 3) {
      throw new ValidationError('Slug must be at least 3 characters');
    }

    const specs = this.getVPSTierSpecs(tier);
    
    // Generate VPS name (max 32 chars for TransIP)
    const timestamp = Date.now();
    const vpsName = `vps-${slug}-${timestamp}`.substring(0, 32);

    // Build VPS configuration
    const vpsConfig = {
      productName: specs.productName,
      addons: specs.addons,
      availabilityZone: 'ams0', // Amsterdam datacenter
      description: `${specs.description} - ${slug}`,
      operatingSystem: 'ubuntu-22.04',
      hostname: `${slug}.recruitiq.nl`,
      installFlavour: 'cloudinit',
      username: 'recruitiq',
      // In test mode, password doesn't matter
      // In production, generate secure password
      hashedPassword: await this._generateHashedPassword(),
      sshKeys: process.env.TRANSIP_SSH_KEYS?.split(',') || [],
      base64InstallText: this._generateCloudInitConfig(slug, organizationId)
    };

    try {
      const result = await transipClient.createVPS(vpsConfig);

      logger.info('VPS created successfully', {
        organizationId,
        vpsName,
        testMode: transipClient.isInTestMode(),
        result
      });

      return {
        vpsName,
        ipAddress: result.vps?.ipAddress || 'pending',
        status: result.vps?.status || 'creating',
        hostname: vpsConfig.hostname,
        tier,
        specs,
        testMode: transipClient.isInTestMode(),
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('VPS creation failed', {
        organizationId,
        error: error.message,
        testMode: transipClient.isInTestMode()
      });
      throw error;
    }
  }

  /**
   * Get VPS status
   */
  async getVPSStatus(vpsName) {
    try {
      const result = await transipClient.getVPS(vpsName);
      
      return {
        name: result.vps.name,
        status: result.vps.status,
        ipAddress: result.vps.ipAddress,
        cpus: result.vps.cpus,
        memory: result.vps.memorySize,
        disk: result.vps.diskSize,
        isLocked: result.vps.isLocked,
        isBlocked: result.vps.isBlocked,
        operatingSystem: result.vps.operatingSystem
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundError(`VPS not found: ${vpsName}`);
      }
      throw error;
    }
  }

  /**
   * List all VPS instances
   */
  async listVPS() {
    const result = await transipClient.listVPS();
    return result.vpss || [];
  }

  /**
   * VPS operations
   */
  
  async startVPS(vpsName) {
    logger.info('Starting VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.startVPS(vpsName);
  }

  async stopVPS(vpsName) {
    logger.info('Stopping VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.stopVPS(vpsName);
  }

  async rebootVPS(vpsName) {
    logger.info('Rebooting VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.rebootVPS(vpsName);
  }

  async deleteVPS(vpsName) {
    logger.warn('Deleting VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.deleteVPS(vpsName);
  }

  /**
   * Snapshot management
   */
  
  async createSnapshot(vpsName, description) {
    return await transipClient.createSnapshot(vpsName, description);
  }

  async listSnapshots(vpsName) {
    const result = await transipClient.listSnapshots(vpsName);
    return result.snapshots || [];
  }

  async deleteSnapshot(vpsName, snapshotId) {
    return await transipClient.deleteSnapshot(vpsName, snapshotId);
  }

  async revertToSnapshot(vpsName, snapshotId) {
    return await transipClient.revertToSnapshot(vpsName, snapshotId);
  }

  /**
   * Firewall management
   */
  
  async getFirewall(vpsName) {
    const result = await transipClient.getFirewall(vpsName);
    return result.vpsFirewall;
  }

  async updateFirewall(vpsName, rules) {
    // Build firewall configuration
    const firewallConfig = {
      isEnabled: true,
      ruleSet: rules.map(rule => ({
        description: rule.description,
        startPort: rule.port,
        endPort: rule.port,
        protocol: rule.protocol || 'tcp',
        whitelist: rule.whitelist || ['0.0.0.0/0']
      }))
    };

    return await transipClient.updateFirewall(vpsName, firewallConfig);
  }

  /**
   * Usage statistics
   */
  
  async getUsageStats(vpsName) {
    return await transipClient.getUsageStats(vpsName);
  }

  /**
   * Test mode helpers
   */
  
  getTestModeStatus() {
    return transipClient.getTestModeStatus();
  }

  /**
   * Private helpers
   */
  
  async _generateHashedPassword() {
    // Generate bcrypt hash
    // In test mode, use dummy password
    if (transipClient.isInTestMode()) {
      return '$2y$10$dummyhashedpasswordfortesting';
    }
    
    // In production, generate real password
    const crypto = await import('crypto');
    const password = crypto.randomBytes(32).toString('hex');
    const bcrypt = await import('bcrypt');
    return await bcrypt.hash(password, 10);
  }

  _generateCloudInitConfig(slug, organizationId) {
    // Cloud-init configuration for automatic setup
    const config = `#cloud-config
hostname: ${slug}
fqdn: ${slug}.recruitiq.nl

# Install Docker and other dependencies
packages:
  - docker.io
  - docker-compose
  - git
  - nginx

# Setup RecruitIQ deployment
runcmd:
  - systemctl enable docker
  - systemctl start docker
  - echo "VPS ready for ${slug}" > /root/provisioning-complete.txt
`;

    return Buffer.from(config).toString('base64');
  }
}

export default new VPSService();
```

### Phase 3: Portal API Endpoints

**File:** `backend/src/routes/portal/vps.js`

```javascript
import express from 'express';
import vpsService from '../../services/transip/VPSService.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * Get test mode status
 */
router.get('/test-mode', async (req, res, next) => {
  try {
    const status = vpsService.getTestModeStatus();
    
    res.json({
      success: true,
      testMode: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List all VPS instances
 */
router.get('/', async (req, res, next) => {
  try {
    const vpsList = await vpsService.listVPS();
    
    res.json({
      success: true,
      vpsList,
      testMode: vpsService.getTestModeStatus().enabled
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get VPS details
 */
router.get('/:vpsName', async (req, res, next) => {
  try {
    const vps = await vpsService.getVPSStatus(req.params.vpsName);
    
    res.json({
      success: true,
      vps
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new VPS
 */
router.post('/', async (req, res, next) => {
  try {
    const { organizationId, slug, tier } = req.body;
    
    const vps = await vpsService.createVPS(organizationId, slug, tier);
    
    res.status(201).json({
      success: true,
      vps,
      message: vps.testMode 
        ? 'VPS created in TEST MODE - no real resources created'
        : 'VPS created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * VPS operations
 */
router.post('/:vpsName/start', async (req, res, next) => {
  try {
    await vpsService.startVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS start command sent'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:vpsName/stop', async (req, res, next) => {
  try {
    await vpsService.stopVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS stop command sent'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:vpsName/reboot', async (req, res, next) => {
  try {
    await vpsService.rebootVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS reboot command sent'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:vpsName', async (req, res, next) => {
  try {
    await vpsService.deleteVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS deletion scheduled'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Snapshot management
 */
router.get('/:vpsName/snapshots', async (req, res, next) => {
  try {
    const snapshots = await vpsService.listSnapshots(req.params.vpsName);
    
    res.json({
      success: true,
      snapshots
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:vpsName/snapshots', async (req, res, next) => {
  try {
    const { description } = req.body;
    const snapshot = await vpsService.createSnapshot(req.params.vpsName, description);
    
    res.status(201).json({
      success: true,
      snapshot,
      message: vpsService.getTestModeStatus().enabled
        ? 'Snapshot created in TEST MODE - no real snapshot created'
        : 'Snapshot created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Firewall management
 */
router.get('/:vpsName/firewall', async (req, res, next) => {
  try {
    const firewall = await vpsService.getFirewall(req.params.vpsName);
    
    res.json({
      success: true,
      firewall
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:vpsName/firewall', async (req, res, next) => {
  try {
    const { rules } = req.body;
    await vpsService.updateFirewall(req.params.vpsName, rules);
    
    res.json({
      success: true,
      message: 'Firewall rules updated'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Usage statistics
 */
router.get('/:vpsName/usage', async (req, res, next) => {
  try {
    const usage = await vpsService.getUsageStats(req.params.vpsName);
    
    res.json({
      success: true,
      usage
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## Portal UI Integration

### VPS Management Dashboard

**File:** `apps/portal/src/pages/Infrastructure/VPSManagement.tsx`

```tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalAPI } from '@recruitiq/api-client';
import { AlertTriangle, Server, Play, Square, RotateCw } from 'lucide-react';

export default function VPSManagement() {
  const queryClient = useQueryClient();
  const [selectedVPS, setSelectedVPS] = useState(null);

  // Get test mode status
  const { data: testModeStatus } = useQuery({
    queryKey: ['vps-test-mode'],
    queryFn: () => portalAPI.get('/api/vps/test-mode'),
  });

  // List all VPS
  const { data: vpsData, isLoading } = useQuery({
    queryKey: ['vps-list'],
    queryFn: () => portalAPI.get('/api/vps'),
  });

  // VPS operations mutations
  const startVPS = useMutation({
    mutationFn: (vpsName) => portalAPI.post(`/api/vps/${vpsName}/start`),
    onSuccess: () => queryClient.invalidateQueries(['vps-list']),
  });

  const stopVPS = useMutation({
    mutationFn: (vpsName) => portalAPI.post(`/api/vps/${vpsName}/stop`),
    onSuccess: () => queryClient.invalidateQueries(['vps-list']),
  });

  const rebootVPS = useMutation({
    mutationFn: (vpsName) => portalAPI.post(`/api/vps/${vpsName}/reboot`),
    onSuccess: () => queryClient.invalidateQueries(['vps-list']),
  });

  if (isLoading) {
    return <div>Loading VPS instances...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Test Mode Warning */}
      {testModeStatus?.data?.testMode?.enabled && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm text-yellow-700 font-medium">
                Test Mode Active
              </p>
              <p className="text-sm text-yellow-600 mt-1">
                {testModeStatus.data.testMode.warning}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">VPS Management</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => {/* Open create VPS modal */}}
        >
          <Server className="inline-block mr-2 h-4 w-4" />
          Create VPS
        </button>
      </div>

      {/* VPS List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vpsData?.data?.vpsList?.map((vps) => (
          <div
            key={vps.name}
            className="bg-white rounded-lg shadow p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{vps.description}</h3>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  vps.status === 'running'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {vps.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>IP:</strong> {vps.ipAddress}</p>
              <p><strong>Hostname:</strong> {vps.hostname}</p>
              <p><strong>CPU:</strong> {vps.cpus} cores</p>
              <p><strong>RAM:</strong> {(vps.memorySize / 1024).toFixed(0)} GB</p>
              <p><strong>Disk:</strong> {(vps.diskSize / 1024 / 1024).toFixed(0)} GB</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {vps.status === 'running' ? (
                <>
                  <button
                    onClick={() => stopVPS.mutate(vps.name)}
                    className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    disabled={stopVPS.isPending}
                  >
                    <Square className="inline-block h-4 w-4 mr-1" />
                    Stop
                  </button>
                  <button
                    onClick={() => rebootVPS.mutate(vps.name)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    disabled={rebootVPS.isPending}
                  >
                    <RotateCw className="inline-block h-4 w-4 mr-1" />
                    Reboot
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startVPS.mutate(vps.name)}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  disabled={startVPS.isPending}
                >
                  <Play className="inline-block h-4 w-4 mr-1" />
                  Start
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Development Testing (Test Mode Enabled)

```bash
# Environment configuration
NODE_ENV=development
TRANSIP_USERNAME=your_username
TRANSIP_PRIVATE_KEY=/path/to/key.pem

# Start backend
cd backend
npm run dev

# Test VPS operations
curl -X POST http://localhost:3001/api/vps \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org-123",
    "slug": "testcorp",
    "tier": "professional"
  }'

# Verify test mode is active
curl http://localhost:3001/api/vps/test-mode \
  -H "Authorization: Bearer $TOKEN"

# Response should indicate test mode
{
  "success": true,
  "testMode": {
    "enabled": true,
    "environment": "development",
    "warning": "Test mode enabled - no real resources will be created"
  }
}
```

### Test Scenarios

#### 1. VPS Lifecycle
- Create VPS → Verify response structure
- Start VPS → Check test mode bypass
- Stop VPS → Check test mode bypass
- Delete VPS → Verify no actual deletion

#### 2. Snapshot Management
- Create snapshot → Verify mock response
- List snapshots → Check empty list (test mode)
- Revert to snapshot → Verify test mode bypass

#### 3. Firewall Configuration
- Get current firewall → Check empty rules
- Update firewall → Verify test mode bypass
- Verify rules not actually applied

#### 4. Error Handling
- Invalid VPS name → 404 error
- Invalid tier → Validation error
- Missing credentials → Authentication error

---

## Production Deployment Plan

### Phase 1: Staging Environment

```bash
# staging.env
NODE_ENV=staging
TRANSIP_USERNAME=your_username
TRANSIP_PRIVATE_KEY=/path/to/key.pem
ENABLE_VPS_PROVISIONING=false  # Safety flag
```

**Test with real credentials but test mode active:**
- Verify API authentication works
- Test all operations return success
- Confirm no resources created on TransIP account

### Phase 2: Production Readiness

```bash
# production.env
NODE_ENV=production
TRANSIP_USERNAME=your_production_username
TRANSIP_PRIVATE_KEY=/path/to/production/key.pem
ENABLE_VPS_PROVISIONING=true
```

**Pre-production checklist:**
- [ ] TransIP account has sufficient balance
- [ ] VPS quota confirmed
- [ ] SSH keys configured
- [ ] Firewall rules documented
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured

---

## Security Considerations

### API Key Management

```javascript
// Never commit credentials
// Use environment variables or secrets manager
const transipConfig = {
  username: process.env.TRANSIP_USERNAME,
  privateKey: process.env.TRANSIP_PRIVATE_KEY,
};

// In production, use secrets management service
import secretsManager from './services/SecretsManager.js';
const privateKey = await secretsManager.getSecret('TRANSIP_PRIVATE_KEY');
```

### Authorization

```javascript
// Only admins can manage VPS
router.use(requireRole('admin'));

// Log all VPS operations
logger.logSecurityEvent('vps_operation', {
  userId: req.user.id,
  vpsName,
  operation: 'create',
  testMode: transipClient.isInTestMode()
});
```

### Rate Limiting

```javascript
// Strict rate limits for VPS operations
const vpsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 operations per 15 minutes
  message: 'Too many VPS operations, please try again later'
});

router.use('/vps', vpsRateLimiter);
```

---

## Next Steps

1. **✅ Review this implementation plan**
2. **Create TransIP test account** (if not already available)
3. **Implement TransIPClient with test mode support**
4. **Implement VPSService layer**
5. **Create Portal API endpoints**
6. **Build Portal UI for VPS management**
7. **Test all operations in test mode**
8. **Document API for frontend team**
9. **Create monitoring dashboards**
10. **Plan production deployment**

---

## References

- **TransIP Test Mode Documentation**: https://api.transip.nl/rest/docs.html#header-test-mode
- **TransIP VPS API**: https://api.transip.nl/rest/docs.html#vps-vps
- **TransIP SDK**: https://github.com/IFMSA-NL/transip-api

---

**Document Version:** 1.0  
**Last Updated:** November 27, 2025  
**Status:** Ready for Implementation
