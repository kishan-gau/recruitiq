import { useState } from 'react';
import { X, Mail, Lock, Info } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';

interface GrantAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  onSuccess?: () => void;
}

export default function GrantAccessModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeEmail,
  onSuccess,
}: GrantAccessModalProps) {
  const { paylinq } = usePaylinqAPI();
  const { success: showSuccess, error: showError } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: employeeEmail || '',
    password: '',
    useAutoPassword: true,
    sendEmail: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      showError('Email is required');
      return;
    }

    if (!formData.useAutoPassword && !formData.password) {
      showError('Please enter a password or use auto-generated password');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData: any = {
        email: formData.email,
        sendEmail: formData.sendEmail,
      };

      // Only include password if not using auto-generated
      if (!formData.useAutoPassword && formData.password) {
        requestData.password = formData.password;
      }

      const response = await paylinq.grantEmployeeAccess(employeeId, requestData);

      if (response.success) {
        const tempPassword = response.data?.temporaryPassword;
        
        if (tempPassword) {
          showSuccess(
            `Access granted! Temporary password: ${tempPassword}\n` +
            `${formData.sendEmail ? 'Login credentials have been emailed.' : 'Please share this password securely.'}`
          );
        } else {
          showSuccess('System access granted successfully!');
        }
        
        onSuccess?.();
        onClose();
      } else {
        showError(response.message || 'Failed to grant access');
      }
    } catch (error: any) {
      console.error('Failed to grant access:', error);
      showError(error.response?.data?.message || error.message || 'Failed to grant system access');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Grant System Access</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Employee:</strong> {employeeName}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              This will create a user account and send login credentials.
            </p>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline-block w-4 h-4 mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Password Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="inline-block w-4 h-4 mr-1" />
              Password
            </label>
            
            <div className="space-y-3">
              {/* Auto-generate option */}
              <label className="flex items-start">
                <input
                  type="radio"
                  checked={formData.useAutoPassword}
                  onChange={() => setFormData({ ...formData, useAutoPassword: true, password: '' })}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Auto-generate secure password</div>
                  <div className="text-sm text-gray-600">
                    A secure 16-character password will be generated
                  </div>
                </div>
              </label>

              {/* Custom password option */}
              <label className="flex items-start">
                <input
                  type="radio"
                  checked={!formData.useAutoPassword}
                  onChange={() => setFormData({ ...formData, useAutoPassword: false })}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Set custom password</div>
                  {!formData.useAutoPassword && (
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Minimum 8 characters"
                      minLength={8}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Send Email Option */}
          <div>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.sendEmail}
                onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Send credentials via email</div>
                <div className="text-sm text-gray-600">
                  Login credentials will be sent to the employee's email address
                </div>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
            <Info className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>Security Note:</strong> If email delivery is not enabled, make sure to securely 
              communicate the temporary password to the employee.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Granting Access...' : 'Grant Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

