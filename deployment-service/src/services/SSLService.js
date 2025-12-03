/**
 * SSL Service
 * 
 * Manages SSL certificates using Let's Encrypt / Certbot.
 * Handles obtaining, renewing, and revoking certificates.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SSLService {
  constructor(options = {}) {
    this.sshOptions = options.sshOptions || '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null';
    this.email = options.email || 'admin@recruitiq.nl';
    this.certbotPath = options.certbotPath || '/usr/bin/certbot';
    this.webroot = options.webroot || '/var/www/html';
  }

  /**
   * Execute SSH command on VPS
   * @param {string} vpsIp - VPS IP address
   * @param {string} command - Command to execute
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Command result
   */
  async execSSH(vpsIp, command, sshKey) {
    const sshCmd = `ssh ${this.sshOptions} -i "${sshKey}" root@${vpsIp} "${command}"`;
    
    try {
      // 5 min timeout for SSL operations (Let's Encrypt can be slow)
      const { stdout, stderr } = await execAsync(sshCmd, { timeout: 300000 });
      return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        stdout: error.stdout?.trim() || '', 
        stderr: error.stderr?.trim() || '' 
      };
    }
  }

  /**
   * Obtain SSL certificate for a domain using NGINX plugin
   * @param {string} domain - Full domain name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Result with certificate details
   */
  async obtainCertificate(domain, vpsIp, sshKey, options = {}) {
    const { staging = false, redirect = true } = options;

    console.log(`[SSLService] Obtaining SSL certificate for: ${domain}`);

    // Build certbot command
    let certbotCmd = `${this.certbotPath} --nginx -d ${domain}`;
    certbotCmd += ' --non-interactive';
    certbotCmd += ' --agree-tos';
    certbotCmd += ` --email ${this.email}`;
    
    if (staging) {
      certbotCmd += ' --staging'; // Use staging server for testing
    }
    
    if (redirect) {
      certbotCmd += ' --redirect'; // Redirect HTTP to HTTPS
    }

    const result = await this.execSSH(vpsIp, certbotCmd, sshKey);

    if (!result.success) {
      // Check for common errors
      if (result.stderr.includes('too many certificates') || 
          result.stderr.includes('rate limit')) {
        throw new Error('Let\'s Encrypt rate limit reached. Try again later or use staging.');
      }
      
      if (result.stderr.includes('DNS problem') || 
          result.stderr.includes('Domain not found')) {
        throw new Error(`DNS not configured for ${domain}. Ensure domain points to VPS IP.`);
      }
      
      if (result.stderr.includes('Connection refused') ||
          result.stderr.includes('Timeout')) {
        throw new Error(`Cannot connect to ${domain}. Check firewall and NGINX configuration.`);
      }

      throw new Error(`Failed to obtain SSL certificate: ${result.stderr || result.error}`);
    }

    console.log(`[SSLService] SSL certificate obtained for: ${domain}`);

    // Get certificate info
    const certInfo = await this.getCertificateInfo(domain, vpsIp, sshKey);

    return {
      success: true,
      domain,
      ...certInfo
    };
  }

  /**
   * Obtain SSL certificate using webroot method (alternative to NGINX plugin)
   * @param {string} domain - Full domain name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Result
   */
  async obtainCertificateWebroot(domain, vpsIp, sshKey, options = {}) {
    const { staging = false } = options;

    console.log(`[SSLService] Obtaining SSL certificate (webroot) for: ${domain}`);

    // Ensure webroot directory exists
    await this.execSSH(vpsIp, `mkdir -p ${this.webroot}/.well-known/acme-challenge`, sshKey);

    let certbotCmd = `${this.certbotPath} certonly --webroot`;
    certbotCmd += ` -w ${this.webroot}`;
    certbotCmd += ` -d ${domain}`;
    certbotCmd += ' --non-interactive';
    certbotCmd += ' --agree-tos';
    certbotCmd += ` --email ${this.email}`;
    
    if (staging) {
      certbotCmd += ' --staging';
    }

    const result = await this.execSSH(vpsIp, certbotCmd, sshKey);

    if (!result.success) {
      throw new Error(`Failed to obtain SSL certificate: ${result.stderr || result.error}`);
    }

    return {
      success: true,
      domain,
      method: 'webroot',
      certPath: `/etc/letsencrypt/live/${domain}/fullchain.pem`,
      keyPath: `/etc/letsencrypt/live/${domain}/privkey.pem`
    };
  }

  /**
   * Get certificate information
   * @param {string} domain - Domain name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Certificate info
   */
  async getCertificateInfo(domain, vpsIp, sshKey) {
    const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
    
    // Get certificate expiry date
    const expiryResult = await this.execSSH(vpsIp,
      `openssl x509 -enddate -noout -in ${certPath} 2>/dev/null | cut -d= -f2`,
      sshKey);

    // Get certificate issuer
    const issuerResult = await this.execSSH(vpsIp,
      `openssl x509 -issuer -noout -in ${certPath} 2>/dev/null | sed 's/issuer=//'`,
      sshKey);

    let expiresAt = null;
    if (expiryResult.success && expiryResult.stdout) {
      expiresAt = new Date(expiryResult.stdout).toISOString();
    }

    return {
      exists: expiryResult.success,
      certPath,
      keyPath: `/etc/letsencrypt/live/${domain}/privkey.pem`,
      expiresAt,
      issuer: issuerResult.stdout || 'Unknown',
      daysUntilExpiry: expiresAt ? this.daysUntil(new Date(expiresAt)) : null
    };
  }

  /**
   * Calculate days until a date
   * @param {Date} date - Target date
   * @returns {number} Days until date
   */
  daysUntil(date) {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Renew SSL certificate
   * @param {string} domain - Domain name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Result
   */
  async renewCertificate(domain, vpsIp, sshKey) {
    console.log(`[SSLService] Renewing SSL certificate for: ${domain}`);

    const result = await this.execSSH(vpsIp,
      `${this.certbotPath} renew --cert-name ${domain} --quiet`,
      sshKey);

    if (!result.success) {
      throw new Error(`Failed to renew certificate: ${result.stderr || result.error}`);
    }

    // Reload NGINX to use new certificate
    await this.execSSH(vpsIp, 'nginx -s reload', sshKey);

    return {
      success: true,
      domain,
      renewed: true
    };
  }

  /**
   * Renew all certificates that are close to expiry
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Result
   */
  async renewAllCertificates(vpsIp, sshKey) {
    console.log('[SSLService] Renewing all certificates');

    const result = await this.execSSH(vpsIp,
      `${this.certbotPath} renew --quiet`,
      sshKey);

    if (!result.success) {
      throw new Error(`Failed to renew certificates: ${result.stderr || result.error}`);
    }

    // Reload NGINX
    await this.execSSH(vpsIp, 'nginx -s reload', sshKey);

    return {
      success: true,
      output: result.stdout
    };
  }

  /**
   * Revoke SSL certificate
   * @param {string} domain - Domain name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Result
   */
  async revokeCertificate(domain, vpsIp, sshKey) {
    console.log(`[SSLService] Revoking SSL certificate for: ${domain}`);

    const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;

    const result = await this.execSSH(vpsIp,
      `${this.certbotPath} revoke --cert-path ${certPath} --non-interactive`,
      sshKey);

    if (!result.success && !result.stderr.includes('already revoked')) {
      throw new Error(`Failed to revoke certificate: ${result.stderr || result.error}`);
    }

    // Delete certificate files
    await this.execSSH(vpsIp,
      `${this.certbotPath} delete --cert-name ${domain} --non-interactive`,
      sshKey);

    console.log(`[SSLService] SSL certificate revoked for: ${domain}`);

    return {
      success: true,
      domain,
      revoked: true
    };
  }

  /**
   * Check if certificate exists for domain
   * @param {string} domain - Domain name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<boolean>} True if certificate exists
   */
  async certificateExists(domain, vpsIp, sshKey) {
    const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
    const result = await this.execSSH(vpsIp,
      `test -f ${certPath} && echo "exists"`,
      sshKey);
    
    return result.stdout === 'exists';
  }

  /**
   * List all certificates
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Array>} List of certificates
   */
  async listCertificates(vpsIp, sshKey) {
    const result = await this.execSSH(vpsIp,
      `${this.certbotPath} certificates 2>/dev/null`,
      sshKey);

    if (!result.success || !result.stdout) {
      return [];
    }

    // Parse certbot output
    const certificates = [];
    const lines = result.stdout.split('\n');
    let currentCert = null;

    for (const line of lines) {
      if (line.includes('Certificate Name:')) {
        if (currentCert) certificates.push(currentCert);
        currentCert = { name: line.split(':')[1].trim() };
      } else if (currentCert) {
        if (line.includes('Domains:')) {
          currentCert.domains = line.split(':')[1].trim().split(' ');
        } else if (line.includes('Expiry Date:')) {
          const match = line.match(/Expiry Date: (.*?) \(/);
          if (match) {
            currentCert.expiresAt = new Date(match[1]).toISOString();
          }
        }
      }
    }

    if (currentCert) certificates.push(currentCert);

    return certificates;
  }

  /**
   * Check if certbot is installed
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<boolean>} True if certbot is installed
   */
  async isCertbotInstalled(vpsIp, sshKey) {
    const result = await this.execSSH(vpsIp,
      `which ${this.certbotPath} 2>/dev/null || which certbot 2>/dev/null`,
      sshKey);
    
    return result.success && result.stdout.length > 0;
  }

  /**
   * Install certbot if not installed
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Result
   */
  async installCertbot(vpsIp, sshKey) {
    console.log('[SSLService] Installing certbot');

    // Install certbot and nginx plugin
    const result = await this.execSSH(vpsIp,
      'apt-get update && apt-get install -y certbot python3-certbot-nginx',
      sshKey);

    if (!result.success) {
      throw new Error(`Failed to install certbot: ${result.stderr || result.error}`);
    }

    return { success: true };
  }
}

export default SSLService;
