# TransIP OpenStack Integration for RecruitIQ Deployment

## Overview

This document outlines the seamless integration architecture for deploying RecruitIQ instances on TransIP's OpenStack platform with a **one-click deployment system** from the License Manager.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    License Manager Frontend                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Customer Detail Page                                        │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │  [Deploy New Instance] Button                         │  │    │
│  │  │                                                        │  │    │
│  │  │  Deployment Wizard:                                   │  │    │
│  │  │  1. Select Instance Size (Starter/Pro/Enterprise)     │  │    │
│  │  │  2. Choose Data Center (AMS/RTM)                      │  │    │
│  │  │  3. Set Hostname                                      │  │    │
│  │  │  4. Configure Resources                               │  │    │
│  │  │  5. [Deploy] → Shows Progress Bar                     │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ API Call
┌─────────────────────────────────────────────────────────────────────┐
│                    License Manager Backend                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  DeploymentController                                       │    │
│  │  • Validates customer license                              │    │
│  │  • Creates deployment job                                  │    │
│  │  • Returns job ID for progress tracking                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  TransIPService (Node.js SDK)                              │    │
│  │  • Authenticates with TransIP API                          │    │
│  │  • Orchestrates deployment workflow                         │    │
│  │  • Manages deployment lifecycle                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Deployment Queue (Bull/Redis)                             │    │
│  │  • Processes deployments asynchronously                    │    │
│  │  • Handles retries on failure                              │    │
│  │  • Tracks deployment progress                              │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ REST API Calls
┌─────────────────────────────────────────────────────────────────────┐
│                    TransIP REST API v6                              │
│  https://api.transip.nl/v6                                          │
│                                                                      │
│  Endpoints Used:                                                    │
│  • POST /vps                        → Create VPS                    │
│  • GET  /vps/{identifier}           → Get VPS status                │
│  • POST /vps/{id}/operating-systems → Install OS                    │
│  • GET  /vps/{id}/ip-addresses      → Get IP addresses             │
│  • POST /private-networks           → Create private network        │
│  • POST /block-storages             → Attach storage                │
│  • POST /vps/{id}/snapshots         → Create snapshots              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Provisioning
┌─────────────────────────────────────────────────────────────────────┐
│                    TransIP OpenStack Infrastructure                  │
│  • VPS with Ubuntu 22.04 LTS                                        │
│  • Cloud-init auto-configuration                                    │
│  • PostgreSQL database                                              │
│  • Redis cache                                                      │
│  • Nginx reverse proxy + SSL                                        │
│  • RecruitIQ application deployed via Docker                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. TransIP API Integration

### 1.1 Authentication

TransIP uses JWT token-based authentication with RSA key pairs:

```javascript
// backend/src/services/transip/auth.js
const crypto = require('crypto');
const axios = require('axios');

class TransIPAuth {
  constructor(login, privateKey) {
    this.login = login;
    this.privateKey = privateKey;
    this.apiEndpoint = 'https://api.transip.nl/v6';
    this.token = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    // Generate nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Create request body
    const requestBody = {
      login: this.login,
      nonce: nonce,
      read_only: false,
      expiration_time: '30 minutes',
      label: `recruitiq-deployment-${Date.now()}`,
      global_key: true
    };

    // Sign the request body
    const signature = this.signRequest(JSON.stringify(requestBody));

    try {
      const response = await axios.post(
        `${this.apiEndpoint}/auth`,
        requestBody,
        {
          headers: {
            'Signature': signature,
            'Content-Type': 'application/json'
          }
        }
      );

      this.token = response.data.token;
      // Token expires in 30 minutes
      this.tokenExpiry = Date.now() + (30 * 60 * 1000);
      
      return this.token;
    } catch (error) {
      throw new Error(`TransIP authentication failed: ${error.message}`);
    }
  }

  signRequest(body) {
    const sign = crypto.createSign('RSA-SHA512');
    sign.update(body);
    return sign.sign(this.privateKey, 'base64');
  }

  async getToken() {
    // Refresh token if expired or about to expire (5 min buffer)
    if (!this.token || Date.now() > (this.tokenExpiry - 5 * 60 * 1000)) {
      await this.authenticate();
    }
    return this.token;
  }

  async request(method, endpoint, data = null) {
    const token = await this.getToken();
    
    const config = {
      method: method,
      url: `${this.apiEndpoint}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }
}

module.exports = TransIPAuth;
```

### 1.2 Environment Configuration

```env
# backend/.env

# TransIP API Credentials
TRANSIP_LOGIN=your-transip-username
TRANSIP_PRIVATE_KEY_PATH=/path/to/private-key.pem
TRANSIP_WHITELIST_ONLY=false

# Default Deployment Settings
TRANSIP_DEFAULT_ZONE=ams0
TRANSIP_DEFAULT_OS=ubuntu-22.04
TRANSIP_INSTALL_FLAVOUR=cloudinit

# VPS Product Names (based on customer tier)
TRANSIP_VPS_STARTER=vps-bladevps-x4
TRANSIP_VPS_PROFESSIONAL=vps-bladevps-x8
TRANSIP_VPS_ENTERPRISE=vps-bladevps-x16
```

## 2. Deployment Service

### 2.1 TransIP Deployment Service

```javascript
// backend/src/services/transip/deploymentService.js
const TransIPAuth = require('./auth');
const { generateCloudInitConfig } = require('./cloudInit');
const fs = require('fs').promises;

class TransIPDeploymentService {
  constructor() {
    this.auth = new TransIPAuth(
      process.env.TRANSIP_LOGIN,
      null // Will load from file
    );
  }

  async initialize() {
    // Load private key from file
    const privateKey = await fs.readFile(
      process.env.TRANSIP_PRIVATE_KEY_PATH,
      'utf8'
    );
    this.auth.privateKey = privateKey;
  }

  /**
   * Deploy a new RecruitIQ instance
   * @param {Object} config - Deployment configuration
   * @returns {Promise<Object>} - Deployment result with VPS details
   */
  async deployInstance(config) {
    const {
      customerName,
      customerId,
      licenseKey,
      instanceKey,
      tier,
      hostname,
      availabilityZone = 'ams0',
      sshKeys = []
    } = config;

    // Step 1: Determine VPS product based on tier
    const productName = this.getProductForTier(tier);

    // Step 2: Generate cloud-init configuration
    const cloudInitConfig = await generateCloudInitConfig({
      customerName,
      customerId,
      licenseKey,
      instanceKey,
      hostname,
      tier
    });

    // Step 3: Create VPS order
    const vpsName = await this.createVPS({
      productName,
      hostname,
      availabilityZone,
      cloudInitConfig,
      sshKeys
    });

    // Step 4: Wait for VPS to be provisioned
    await this.waitForVPSReady(vpsName);

    // Step 5: Get VPS details (IP address, etc.)
    const vpsDetails = await this.getVPSDetails(vpsName);

    // Step 6: Create snapshot for backup
    await this.createSnapshot(vpsName, 'initial-deployment');

    return {
      vpsName,
      ipAddress: vpsDetails.ipAddress,
      hostname: vpsDetails.hostname,
      status: 'deployed',
      accessUrl: `https://${hostname}`,
      adminUrl: `https://${hostname}/admin`
    };
  }

  getProductForTier(tier) {
    const products = {
      'starter': process.env.TRANSIP_VPS_STARTER,
      'professional': process.env.TRANSIP_VPS_PROFESSIONAL,
      'enterprise': process.env.TRANSIP_VPS_ENTERPRISE
    };
    return products[tier] || products['professional'];
  }

  async createVPS({ productName, hostname, availabilityZone, cloudInitConfig, sshKeys }) {
    const vpsData = {
      productName: productName,
      availabilityZone: availabilityZone,
      description: `RecruitIQ Instance - ${hostname}`,
      operatingSystem: 'ubuntu-22.04',
      installFlavour: 'cloudinit',
      hostname: hostname,
      username: 'recruitiq',
      sshKeys: sshKeys,
      base64InstallText: Buffer.from(cloudInitConfig).toString('base64')
    };

    const response = await this.auth.request('POST', '/vps', vpsData);
    
    // Extract VPS name from response or location header
    // The VPS name is typically returned in the response
    return `${hostname.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
  }

  async waitForVPSReady(vpsName, maxWaitTime = 600000) {
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const vps = await this.getVPSDetails(vpsName);
      
      if (vps.status === 'running') {
        // Wait additional 30 seconds for cloud-init to complete
        await new Promise(resolve => setTimeout(resolve, 30000));
        return true;
      }

      if (vps.status === 'error') {
        throw new Error(`VPS deployment failed: ${vps.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('VPS deployment timeout');
  }

  async getVPSDetails(vpsName) {
    const response = await this.auth.request('GET', `/vps/${vpsName}`);
    return response.vps;
  }

  async createSnapshot(vpsName, description) {
    await this.auth.request('POST', `/vps/${vpsName}/snapshots`, {
      description: description,
      shouldStartVps: true
    });
  }

  async getIPAddresses(vpsName) {
    const response = await this.auth.request('GET', `/vps/${vpsName}/ip-addresses`);
    return response.ipAddresses;
  }

  async attachBlockStorage(vpsName, sizeGB) {
    await this.auth.request('POST', '/block-storages', {
      type: 'fast-storage',
      size: sizeGB * 1024 * 1024, // Convert GB to KB
      offsiteBackups: true,
      vpsName: vpsName,
      description: 'RecruitIQ Database Storage'
    });
  }

  async createPrivateNetwork(customerName) {
    const networkName = `recruitiq-${customerName.toLowerCase().replace(/\s+/g, '-')}`;
    
    await this.auth.request('POST', '/private-networks', {
      name: networkName,
      description: `Private network for ${customerName}`
    });

    return networkName;
  }

  async stopVPS(vpsName) {
    await this.auth.request('PATCH', `/vps/${vpsName}`, {
      action: 'stop'
    });
  }

  async startVPS(vpsName) {
    await this.auth.request('PATCH', `/vps/${vpsName}`, {
      action: 'start'
    });
  }

  async rebootVPS(vpsName) {
    await this.auth.request('PATCH', `/vps/${vpsName}`, {
      action: 'reset'
    });
  }

  async upgradeVPS(vpsName, newProductName) {
    await this.auth.request('POST', `/vps/${vpsName}/upgrades`, {
      productName: newProductName
    });
  }

  async deleteVPS(vpsName) {
    await this.auth.request('DELETE', `/vps/${vpsName}`, {
      endTime: 'end'
    });
  }
}

module.exports = TransIPDeploymentService;
```

### 2.2 Cloud-Init Configuration Generator

```javascript
// backend/src/services/transip/cloudInit.js
const yaml = require('yaml');

async function generateCloudInitConfig(config) {
  const {
    customerName,
    customerId,
    licenseKey,
    instanceKey,
    hostname,
    tier
  } = config;

  const cloudConfig = {
    '#cloud-config': null,
    hostname: hostname,
    fqdn: `${hostname}.recruitiq.cloud`,
    manage_etc_hosts: true,
    
    users: [
      {
        name: 'recruitiq',
        sudo: ['ALL=(ALL) NOPASSWD:ALL'],
        groups: 'sudo',
        shell: '/bin/bash',
        lock_passwd: false
      }
    ],

    packages: [
      'docker.io',
      'docker-compose',
      'nginx',
      'postgresql-14',
      'redis-server',
      'certbot',
      'python3-certbot-nginx',
      'git',
      'curl',
      'ufw'
    ],

    runcmd: [
      // Enable and start services
      'systemctl enable docker',
      'systemctl start docker',
      'usermod -aG docker recruitiq',
      
      // Configure firewall
      'ufw allow 22/tcp',
      'ufw allow 80/tcp',
      'ufw allow 443/tcp',
      'ufw --force enable',
      
      // Create application directory
      'mkdir -p /opt/recruitiq',
      'chown recruitiq:recruitiq /opt/recruitiq',
      
      // Download and run deployment script
      `curl -fsSL https://deploy.recruitiq.cloud/install.sh | bash -s -- \\
        --customer-id="${customerId}" \\
        --license-key="${licenseKey}" \\
        --instance-key="${instanceKey}" \\
        --tier="${tier}" \\
        --hostname="${hostname}"`,
      
      // Setup SSL certificate
      `certbot --nginx -d ${hostname} --non-interactive --agree-tos --email deploy@recruitiq.cloud`,
      
      // Create initial backup
      '/opt/recruitiq/scripts/backup.sh',
      
      // Signal deployment complete
      `curl -X POST https://api.recruitiq.cloud/deployments/${customerId}/complete \\
        -H "Content-Type: application/json" \\
        -d '{"status":"success","hostname":"${hostname}"}'`
    ],

    write_files: [
      {
        path: '/opt/recruitiq/.env',
        content: `
CUSTOMER_ID=${customerId}
LICENSE_KEY=${licenseKey}
INSTANCE_KEY=${instanceKey}
TIER=${tier}
HOSTNAME=${hostname}
NODE_ENV=production
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=recruitiq_${customerId}
REDIS_HOST=localhost
REDIS_PORT=6379
`,
        owner: 'recruitiq:recruitiq',
        permissions: '0600'
      },
      {
        path: '/opt/recruitiq/docker-compose.yml',
        content: this.getDockerComposeContent(tier),
        owner: 'recruitiq:recruitiq',
        permissions: '0644'
      },
      {
        path: '/etc/nginx/sites-available/recruitiq',
        content: this.getNginxConfig(hostname),
        owner: 'root:root',
        permissions: '0644'
      }
    ],

    final_message: `RecruitIQ deployment completed successfully!
Customer: ${customerName}
Instance URL: https://${hostname}
Access your instance at the URL above.`
  };

  return yaml.stringify(cloudConfig);
}

function getDockerComposeContent(tier) {
  // Adjust resources based on tier
  const resources = {
    starter: { cpus: '2', memory: '4g' },
    professional: { cpus: '4', memory: '8g' },
    enterprise: { cpus: '8', memory: '16g' }
  };

  const { cpus, memory } = resources[tier] || resources.professional;

  return `version: '3.8'

services:
  app:
    image: recruitiq/app:latest
    restart: always
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    deploy:
      resources:
        limits:
          cpus: '${cpus}'
          memory: ${memory}
    networks:
      - recruitiq

  db:
    image: postgres:14
    restart: always
    environment:
      POSTGRES_DB: \${DATABASE_NAME}
      POSTGRES_USER: recruitiq
      POSTGRES_PASSWORD: \${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - recruitiq

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - recruitiq

volumes:
  postgres_data:
  redis_data:

networks:
  recruitiq:
    driver: bridge
`;
}

function getNginxConfig(hostname) {
  return `server {
    listen 80;
    server_name ${hostname};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
}

module.exports = { generateCloudInitConfig };
```

## 3. Deployment Controller

```javascript
// backend/src/controllers/deploymentController.js
const TransIPDeploymentService = require('../services/transip/deploymentService');
const { createDeploymentJob } = require('../services/deploymentQueue');
const Customer = require('../models/Customer');
const Instance = require('../models/Instance');

class DeploymentController {
  constructor() {
    this.deploymentService = new TransIPDeploymentService();
  }

  async initialize() {
    await this.deploymentService.initialize();
  }

  /**
   * POST /api/admin/customers/:id/deploy
   * Deploy a new instance for a customer
   */
  async deployInstance(req, res) {
    try {
      const { id: customerId } = req.params;
      const {
        hostname,
        availabilityZone,
        sshKeys
      } = req.body;

      // Get customer details
      const customer = await Customer.getById(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Validate customer has active license
      if (customer.status !== 'active') {
        return res.status(400).json({ 
          error: 'Customer must have active license to deploy instance' 
        });
      }

      // Create deployment job
      const job = await createDeploymentJob({
        customerId: customer.id,
        customerName: customer.name,
        licenseKey: customer.license_key,
        instanceKey: customer.instance_key,
        tier: customer.tier,
        hostname: hostname || `${customer.name.toLowerCase().replace(/\s+/g, '-')}.recruitiq.cloud`,
        availabilityZone: availabilityZone || 'ams0',
        sshKeys: sshKeys || []
      });

      res.status(202).json({
        message: 'Deployment started',
        jobId: job.id,
        estimatedTime: '10-15 minutes',
        trackingUrl: `/api/admin/deployments/${job.id}`
      });

    } catch (error) {
      console.error('Deployment initiation error:', error);
      res.status(500).json({ error: 'Failed to initiate deployment' });
    }
  }

  /**
   * GET /api/admin/deployments/:jobId
   * Get deployment status
   */
  async getDeploymentStatus(req, res) {
    try {
      const { jobId } = req.params;
      
      const job = await getDeploymentJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Deployment job not found' });
      }

      res.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      });

    } catch (error) {
      console.error('Get deployment status error:', error);
      res.status(500).json({ error: 'Failed to get deployment status' });
    }
  }

  /**
   * POST /api/admin/instances/:id/stop
   * Stop an instance
   */
  async stopInstance(req, res) {
    try {
      const { id: instanceId } = req.params;

      const instance = await Instance.getById(instanceId);
      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      await this.deploymentService.stopVPS(instance.vps_name);
      await Instance.updateStatus(instanceId, 'stopped');

      res.json({ message: 'Instance stopped successfully' });

    } catch (error) {
      console.error('Stop instance error:', error);
      res.status(500).json({ error: 'Failed to stop instance' });
    }
  }

  /**
   * POST /api/admin/instances/:id/start
   * Start an instance
   */
  async startInstance(req, res) {
    try {
      const { id: instanceId } = req.params;

      const instance = await Instance.getById(instanceId);
      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      await this.deploymentService.startVPS(instance.vps_name);
      await Instance.updateStatus(instanceId, 'running');

      res.json({ message: 'Instance started successfully' });

    } catch (error) {
      console.error('Start instance error:', error);
      res.status(500).json({ error: 'Failed to start instance' });
    }
  }

  /**
   * DELETE /api/admin/instances/:id
   * Delete an instance
   */
  async deleteInstance(req, res) {
    try {
      const { id: instanceId } = req.params;

      const instance = await Instance.getById(instanceId);
      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      await this.deploymentService.deleteVPS(instance.vps_name);
      await Instance.delete(instanceId);

      res.json({ message: 'Instance deleted successfully' });

    } catch (error) {
      console.error('Delete instance error:', error);
      res.status(500).json({ error: 'Failed to delete instance' });
    }
  }
}

module.exports = new DeploymentController();
```

## 4. Deployment Queue

```javascript
// backend/src/services/deploymentQueue.js
const Bull = require('bull');
const Redis = require('ioredis');
const TransIPDeploymentService = require('./transip/deploymentService');
const Instance = require('../models/Instance');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const deploymentQueue = new Bull('deployments', {
  redis: redis
});

// Process deployment jobs
deploymentQueue.process(async (job) => {
  const { customerId, customerName, licenseKey, instanceKey, tier, hostname, availabilityZone, sshKeys } = job.data;

  const deploymentService = new TransIPDeploymentService();
  await deploymentService.initialize();

  try {
    // Update progress
    job.progress(10);
    job.log('Starting VPS provisioning...');

    // Deploy instance
    const result = await deploymentService.deployInstance({
      customerName,
      customerId,
      licenseKey,
      instanceKey,
      tier,
      hostname,
      availabilityZone,
      sshKeys
    });

    job.progress(90);
    job.log('VPS provisioned, finalizing setup...');

    // Save instance to database
    await Instance.create({
      customer_id: customerId,
      vps_name: result.vpsName,
      hostname: hostname,
      ip_address: result.ipAddress,
      status: 'running',
      tier: tier,
      availability_zone: availabilityZone
    });

    job.progress(100);
    job.log('Deployment completed successfully!');

    return result;

  } catch (error) {
    job.log(`Deployment failed: ${error.message}`);
    throw error;
  }
});

// Event handlers
deploymentQueue.on('completed', (job, result) => {
  console.log(`Deployment job ${job.id} completed:`, result);
});

deploymentQueue.on('failed', (job, err) => {
  console.error(`Deployment job ${job.id} failed:`, err.message);
});

async function createDeploymentJob(data) {
  const job = await deploymentQueue.add(data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    timeout: 900000 // 15 minutes
  });

  return job;
}

async function getDeploymentJobStatus(jobId) {
  const job = await deploymentQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress();

  return {
    id: job.id,
    status: state,
    progress: progress,
    currentStep: job._progress?.currentStep,
    result: job.returnvalue,
    error: job.failedReason,
    createdAt: new Date(job.timestamp),
    completedAt: job.finishedOn ? new Date(job.finishedOn) : null
  };
}

module.exports = {
  deploymentQueue,
  createDeploymentJob,
  getDeploymentJobStatus
};
```

## 5. Frontend Integration

### 5.1 Deployment Button Component

```jsx
// frontend/src/components/DeploymentButton.jsx
import React, { useState } from 'react';
import { Rocket, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

function DeploymentButton({ customerId, customerName, onDeploymentStart }) {
  const [showModal, setShowModal] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [config, setConfig] = useState({
    hostname: '',
    availabilityZone: 'ams0',
    sshKeys: []
  });

  const handleDeploy = async () => {
    if (!config.hostname) {
      toast.error('Please enter a hostname');
      return;
    }

    setDeploying(true);

    try {
      const response = await api.deployInstance(customerId, config);
      
      toast.success('Deployment started! This will take 10-15 minutes.');
      setShowModal(false);
      
      if (onDeploymentStart) {
        onDeploymentStart(response);
      }

    } catch (error) {
      console.error('Deployment error:', error);
      toast.error(error.response?.data?.error || 'Failed to start deployment');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-primary flex items-center"
      >
        <Rocket className="w-4 h-4 mr-2" />
        Deploy New Instance
      </button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Deploy RecruitIQ Instance</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hostname *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., acme-corp.recruitiq.cloud"
                  value={config.hostname}
                  onChange={(e) => setConfig({ ...config, hostname: e.target.value })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  This will be the URL for {customerName}'s RecruitIQ instance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Data Center Location
                </label>
                <select
                  className="input"
                  value={config.availabilityZone}
                  onChange={(e) => setConfig({ ...config, availabilityZone: e.target.value })}
                >
                  <option value="ams0">Amsterdam (ams0)</option>
                  <option value="rtm0">Rotterdam (rtm0)</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">What will be deployed:</h3>
                <ul className="text-sm space-y-1">
                  <li>✓ Ubuntu 22.04 LTS VPS</li>
                  <li>✓ PostgreSQL database</li>
                  <li>✓ Redis cache</li>
                  <li>✓ Nginx with SSL certificate</li>
                  <li>✓ RecruitIQ application (Docker)</li>
                  <li>✓ Automated backups</li>
                </ul>
                <p className="text-sm text-gray-600 mt-3">
                  Estimated deployment time: <strong>10-15 minutes</strong>
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                disabled={deploying}
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                className="btn btn-primary flex items-center"
                disabled={deploying}
              >
                {deploying ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy Instance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeploymentButton;
```

### 5.2 Deployment Progress Component

```jsx
// frontend/src/components/DeploymentProgress.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../services/api';

function DeploymentProgress({ jobId, onComplete }) {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const data = await api.getDeploymentStatus(jobId);
        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          if (onComplete) onComplete(data.result);
        }

        if (data.status === 'failed') {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to fetch deployment status:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [jobId, onComplete]);

  if (!status) return <div>Loading...</div>;

  return (
    <div className="deployment-progress">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Deployment Progress</h3>
          {status.status === 'active' && (
            <Loader className="w-5 h-5 animate-spin text-blue-500" />
          )}
          {status.status === 'completed' && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          {status.status === 'failed' && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${status.progress || 0}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {status.progress || 0}% complete
        </p>
      </div>

      {status.currentStep && (
        <p className="text-sm text-gray-700 mb-3">
          Current step: <strong>{status.currentStep}</strong>
        </p>
      )}

      {status.status === 'completed' && status.result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">
            🎉 Deployment Successful!
          </h4>
          <div className="text-sm space-y-1">
            <p><strong>Instance URL:</strong> <a href={status.result.accessUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">{status.result.accessUrl}</a></p>
            <p><strong>IP Address:</strong> {status.result.ipAddress}</p>
            <p><strong>VPS Name:</strong> {status.result.vpsName}</p>
          </div>
        </div>
      )}

      {status.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">
            Deployment Failed
          </h4>
          <p className="text-sm text-red-700">{status.error}</p>
        </div>
      )}
    </div>
  );
}

export default DeploymentProgress;
```

## 6. API Endpoints

Add to `api.js`:

```javascript
// frontend/src/services/api.js

deployInstance(customerId, config) {
  return this.request('post', `/customers/${customerId}/deploy`, config);
},

getDeploymentStatus(jobId) {
  return this.request('get', `/deployments/${jobId}`);
},

stopInstance(instanceId) {
  return this.request('post', `/instances/${instanceId}/stop`);
},

startInstance(instanceId) {
  return this.request('post', `/instances/${instanceId}/start`);
},

deleteInstance(instanceId) {
  return this.request('delete', `/instances/${instanceId}`);
}
```

## 7. Installation Steps

### 7.1 Install Dependencies

```bash
cd backend
npm install axios bull redis ioredis yaml
```

### 7.2 Setup TransIP Credentials

1. Login to TransIP Control Panel
2. Go to Account → API
3. Generate a new private key
4. Download the private key
5. Save it to `backend/config/transip-private-key.pem`

### 7.3 Update Environment Variables

```env
# backend/.env

TRANSIP_LOGIN=your-username
TRANSIP_PRIVATE_KEY_PATH=./config/transip-private-key.pem
TRANSIP_WHITELIST_ONLY=false

REDIS_URL=redis://localhost:6379
```

### 7.4 Start Redis

```bash
# Windows (using WSL or Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Or install Redis on WSL
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

## 8. Usage Flow

1. **Admin navigates to Customer Detail page**
2. **Clicks "Deploy New Instance" button**
3. **Fills out deployment form:**
   - Hostname (auto-suggested based on customer name)
   - Data center location
   - (Optional) SSH keys
4. **Clicks "Deploy"**
5. **System shows progress modal with:**
   - Progress bar
   - Current step
   - Logs
6. **After 10-15 minutes:**
   - Deployment completes
   - Instance URL displayed
   - Customer can access their RecruitIQ instance

## 9. Advanced Features

### 9.1 Automated Scaling

Monitor instance resource usage and automatically upgrade VPS when thresholds are exceeded:

```javascript
async function checkAndScaleInstance(instanceId) {
  const usage = await getInstanceUsage(instanceId);
  
  if (usage.cpu > 80 && usage.memory > 80) {
    // Upgrade to next tier
    await upgradeInstance(instanceId);
  }
}
```

### 9.2 Automated Backups

Schedule daily snapshots via TransIP API:

```javascript
// Run daily via cron job
async function createDailyBackups() {
  const instances = await Instance.getAllActive();
  
  for (const instance of instances) {
    await deploymentService.createSnapshot(
      instance.vps_name,
      `daily-backup-${Date.now()}`
    );
  }
}
```

### 9.3 Health Monitoring

Monitor instance health and alert on failures:

```javascript
async function monitorInstanceHealth(instanceId) {
  const instance = await Instance.getById(instanceId);
  const vpsDetails = await deploymentService.getVPSDetails(instance.vps_name);
  
  if (vpsDetails.status !== 'running') {
    // Send alert
    await sendAlert(instance.customer_id, 'Instance is down');
  }
}
```

## 10. Security Considerations

1. **API Credentials:** Store TransIP credentials securely using environment variables
2. **Token Rotation:** Automatically refresh tokens before expiry
3. **Network Isolation:** Use private networks for database connections
4. **Firewall Rules:** Only allow necessary ports (80, 443, 22)
5. **SSL Certificates:** Automatically provision Let's Encrypt certificates
6. **Rate Limiting:** Implement rate limiting on deployment endpoints
7. **Audit Logging:** Log all deployment actions for compliance

## Summary

This integration provides a **seamless one-click deployment system** that:

✅ **Eliminates manual server setup** - Everything is automated  
✅ **Provides real-time progress tracking** - Users see exactly what's happening  
✅ **Handles failures gracefully** - Automatic retries and clear error messages  
✅ **Scales automatically** - Easy upgrades and resource management  
✅ **Ensures security** - Firewalls, SSL, and network isolation  
✅ **Enables monitoring** - Health checks and automated backups  

The entire deployment process takes 10-15 minutes from button click to fully functional RecruitIQ instance!
