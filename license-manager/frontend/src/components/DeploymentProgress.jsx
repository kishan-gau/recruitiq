import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, Server, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function DeploymentProgress({ jobId, onComplete }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        const response = await api.getDeploymentStatus(jobId);
        
        if (response.success && response.deployment) {
          setStatus(response.deployment);
          setLoading(false);

          // Stop polling if deployment is complete or failed
          if (response.deployment.state === 'completed' || response.deployment.state === 'failed') {
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
              pollInterval.current = null;
            }

            // Notify parent
            if (onComplete) {
              onComplete(response.deployment);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch deployment status:', err);
        setError(err.response?.data?.error || 'Failed to fetch status');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 5 seconds
    pollInterval.current = setInterval(fetchStatus, 5000);

    // Cleanup
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [jobId, onComplete]);

  if (loading && !status) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <span className="text-gray-600">Loading deployment status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">Error Loading Status</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!status || !status.found) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Deployment Not Found</h4>
            <p className="text-sm text-yellow-700 mt-1">No deployment found with this job ID.</p>
          </div>
        </div>
      </div>
    );
  }

  const { state, progress, result, error: deployError, logs, instanceId, createdAt, processedAt, finishedAt } = status;

  const getStateIcon = () => {
    switch (state) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'active':
        return <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />;
      case 'waiting':
        return <Clock className="w-6 h-6 text-gray-400" />;
      default:
        return <Server className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'active':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStateText = () => {
    switch (state) {
      case 'completed':
        return 'Deployment Completed';
      case 'failed':
        return 'Deployment Failed';
      case 'active':
        return 'Deploying...';
      case 'waiting':
        return 'Waiting in Queue';
      case 'delayed':
        return 'Delayed';
      default:
        return 'Unknown State';
    }
  };

  return (
    <div className={`rounded-lg border p-6 ${getStateColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStateIcon()}
          <div>
            <h3 className="font-semibold text-gray-900">{getStateText()}</h3>
            <p className="text-sm text-gray-600">Instance: {instanceId}</p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>Job ID: {jobId.substring(0, 20)}...</div>
        </div>
      </div>

      {/* Progress Bar */}
      {(state === 'active' || state === 'waiting') && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result (on success) */}
      {state === 'completed' && result && (
        <div className="bg-white rounded-lg p-4 space-y-2 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Deployment Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {result.vpsName && (
              <div>
                <span className="text-gray-500">VPS Name:</span>
                <span className="ml-2 font-mono text-gray-900">{result.vpsName}</span>
              </div>
            )}
            {result.ipAddress && (
              <div>
                <span className="text-gray-500">IP Address:</span>
                <span className="ml-2 font-mono text-gray-900">{result.ipAddress}</span>
              </div>
            )}
            {result.fqdn && (
              <div className="col-span-2">
                <span className="text-gray-500">URL:</span>
                <a
                  href={`https://${result.fqdn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-600 hover:text-indigo-700 underline"
                >
                  https://{result.fqdn}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error (on failure) */}
      {state === 'failed' && deployError && (
        <div className="bg-white rounded-lg p-4 mb-4">
          <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
          <p className="text-sm text-red-700 font-mono">{deployError}</p>
        </div>
      )}

      {/* Logs */}
      {logs && logs.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Deployment Logs</h4>
          <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
        {createdAt && <div>Created: {new Date(createdAt).toLocaleString()}</div>}
        {processedAt && <div>Started: {new Date(processedAt).toLocaleString()}</div>}
        {finishedAt && <div>Finished: {new Date(finishedAt).toLocaleString()}</div>}
      </div>
    </div>
  );
}
