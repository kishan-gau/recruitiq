import Queue from 'bull';
import config from '../config/index.js';
import deploymentService from '../services/transip/deploymentService.js';

// Create deployment queue
const deploymentQueue = new Queue('deployments', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds
    },
    removeOnComplete: false, // Keep completed jobs for history
    removeOnFail: false, // Keep failed jobs for debugging
  },
  limiter: {
    max: config.deployment.maxConcurrentDeployments,
    duration: 60000, // per minute
  },
});

/**
 * Process deployment jobs
 */
deploymentQueue.process(async (job) => {
  const { instanceId, customerId, customerName, licenseKey, tier, hostname, domain, email, productName, region } = job.data;

  console.log(`[Queue] Processing deployment job ${job.id} for instance ${instanceId}`);

  try {
    // Update job progress
    await job.progress(10);
    await job.log('Starting deployment...');

    // Deploy instance
    const result = await deploymentService.deployInstance({
      instanceId,
      customerId,
      customerName,
      licenseKey,
      tier,
      hostname,
      domain,
      email,
      productName,
      region,
    });

    await job.progress(100);
    await job.log('Deployment completed successfully');

    return result;
  } catch (error) {
    await job.log(`Deployment failed: ${error.message}`);
    throw error;
  }
});

/**
 * Queue event handlers
 */
deploymentQueue.on('completed', (job, result) => {
  console.log(`[Queue] Job ${job.id} completed successfully:`, result);
});

deploymentQueue.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} failed:`, err.message);
});

deploymentQueue.on('stalled', (job) => {
  console.warn(`[Queue] Job ${job.id} stalled`);
});

/**
 * Create a deployment job
 * @param {object} deploymentData - Deployment data
 * @returns {Promise<object>} Job information
 */
async function createDeploymentJob(deploymentData) {
  const job = await deploymentQueue.add(deploymentData, {
    jobId: `deployment-${deploymentData.instanceId}-${Date.now()}`,
  });

  console.log(`[Queue] Created deployment job ${job.id} for instance ${deploymentData.instanceId}`);

  return {
    jobId: job.id,
    instanceId: deploymentData.instanceId,
    status: 'queued',
    createdAt: new Date(),
  };
}

/**
 * Get deployment job status
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} Job status
 */
async function getDeploymentJobStatus(jobId) {
  const job = await deploymentQueue.getJob(jobId);

  if (!job) {
    return {
      found: false,
      message: 'Job not found',
    };
  }

  const state = await job.getState();
  const progress = job.progress();
  const logs = await deploymentQueue.getJobLogs(jobId);

  let result = null;
  if (state === 'completed') {
    result = job.returnvalue;
  }

  let error = null;
  if (state === 'failed') {
    error = job.failedReason;
  }

  return {
    found: true,
    jobId: job.id,
    instanceId: job.data.instanceId,
    state,
    progress,
    logs: logs.logs,
    result,
    error,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn ? new Date(job.processedOn) : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
  };
}

/**
 * Cancel a deployment job
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} Result
 */
async function cancelDeploymentJob(jobId) {
  const job = await deploymentQueue.getJob(jobId);

  if (!job) {
    return {
      success: false,
      message: 'Job not found',
    };
  }

  const state = await job.getState();

  if (state === 'completed' || state === 'failed') {
    return {
      success: false,
      message: `Cannot cancel job in state: ${state}`,
    };
  }

  await job.remove();

  return {
    success: true,
    message: 'Job cancelled',
  };
}

/**
 * Get queue statistics
 * @returns {Promise<object>} Queue stats
 */
async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    deploymentQueue.getWaitingCount(),
    deploymentQueue.getActiveCount(),
    deploymentQueue.getCompletedCount(),
    deploymentQueue.getFailedCount(),
    deploymentQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean up old completed and failed jobs
 * @param {number} gracePeriod - Grace period in milliseconds (default: 7 days)
 * @returns {Promise<object>} Cleanup result
 */
async function cleanupOldJobs(gracePeriod = 7 * 24 * 60 * 60 * 1000) {
  const [completedRemoved, failedRemoved] = await Promise.all([
    deploymentQueue.clean(gracePeriod, 'completed'),
    deploymentQueue.clean(gracePeriod, 'failed'),
  ]);

  return {
    completedRemoved: completedRemoved.length,
    failedRemoved: failedRemoved.length,
    total: completedRemoved.length + failedRemoved.length,
  };
}

/**
 * Graceful shutdown
 */
export async function shutdown() {
  console.log('[Queue] Shutting down deployment queue...');
  await deploymentQueue.close();
  console.log('[Queue] Deployment queue closed');
}

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export {
  deploymentQueue,
  createDeploymentJob,
  getDeploymentJobStatus,
  cancelDeploymentJob,
  getQueueStats,
  cleanupOldJobs,
};
