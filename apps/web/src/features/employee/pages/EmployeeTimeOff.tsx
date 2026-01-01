import { useState } from 'react';
import { Calendar, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

/**
 * Employee Time Off Page
 * Mobile-optimized time-off request and management
 * 
 * Features:
 * - Time-off balance display
 * - Request submission form
 * - Request history with status
 * - Mobile-friendly date pickers
 * 
 * From PWA Proposal Phase 2: Time & Attendance Module
 */
export default function EmployeeTimeOff() {
  const [showRequestForm, setShowRequestForm] = useState(false);

  // TODO: Fetch from API
  const balances = [
    { type: 'Vacation', available: 12, total: 15, unit: 'days' },
    { type: 'Sick Leave', available: 5, total: 10, unit: 'days' },
    { type: 'Personal', available: 3, total: 5, unit: 'days' },
  ];

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Time Off
        </h1>
        <p className="text-sm opacity-90 mt-1">
          Manage your leave requests
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Balance Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Available Balance</h2>
          <div className="grid grid-cols-1 gap-3">
            {balances.map((balance) => (
              <BalanceCard key={balance.type} {...balance} />
            ))}
          </div>
        </div>

        {/* Request Button */}
        <button
          onClick={() => setShowRequestForm(true)}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-medium
                   flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90
                   touch-manipulation active:scale-95 transition-all"
        >
          <Send className="h-5 w-5" />
          Request Time Off
        </button>

        {/* Request History */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Request History</h2>
          <div className="space-y-3">
            {/* TODO: Replace with actual requests from API */}
            <RequestCard
              type="Vacation"
              startDate="2026-01-15"
              endDate="2026-01-19"
              days={5}
              status="approved"
              submittedDate="2025-12-20"
            />
            <RequestCard
              type="Sick Leave"
              startDate="2025-12-10"
              endDate="2025-12-10"
              days={1}
              status="approved"
              submittedDate="2025-12-10"
            />
            <RequestCard
              type="Personal"
              startDate="2025-11-25"
              endDate="2025-11-26"
              days={2}
              status="denied"
              submittedDate="2025-11-15"
              reason="Insufficient coverage"
            />
          </div>
        </div>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <TimeOffRequestForm onClose={() => setShowRequestForm(false)} />
      )}
    </div>
  );
}

/**
 * Balance Card Component
 */
interface BalanceCardProps {
  type: string;
  available: number;
  total: number;
  unit: string;
}

function BalanceCard({ type, available, total, unit }: BalanceCardProps) {
  const percentage = (available / total) * 100;
  
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{type}</h3>
        <span className="text-2xl font-bold text-primary">
          {available}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {available} of {total} {unit} available
      </p>
    </div>
  );
}

/**
 * Request Card Component
 */
interface RequestCardProps {
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'denied';
  submittedDate: string;
  reason?: string;
}

function RequestCard({ type, startDate, endDate, days, status, submittedDate, reason }: RequestCardProps) {
  const statusConfig = {
    pending: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-200',
      label: 'Pending',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-500/10',
      border: 'border-green-200',
      label: 'Approved',
    },
    denied: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
      border: 'border-red-200',
      label: 'Denied',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold">{type}</p>
          <p className="text-sm text-muted-foreground">
            Submitted {new Date(submittedDate).toLocaleDateString()}
          </p>
        </div>
        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} ${config.border}`}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-sm mb-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>
          {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' - '}
          {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span>{days} {days === 1 ? 'day' : 'days'}</span>
      </div>

      {/* Reason if denied */}
      {status === 'denied' && reason && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Reason:</strong> {reason}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Time Off Request Form Modal
 */
interface TimeOffRequestFormProps {
  onClose: () => void;
}

function TimeOffRequestForm({ onClose }: TimeOffRequestFormProps) {
  const [formData, setFormData] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit to API
    console.log('Submitting time-off request:', formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Request Time Off</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg touch-manipulation"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Type of Leave
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Add any additional details..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-medium
                     flex items-center justify-center gap-2 hover:bg-primary/90
                     touch-manipulation active:scale-95 transition-all"
          >
            <Send className="h-5 w-5" />
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
}
