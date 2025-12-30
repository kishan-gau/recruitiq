import { X, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { employeesService } from '@/services/employees.service';
import { handleApiError } from '@/utils/errorHandler';

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
  const [email, setEmail] = useState(employeeEmail || '');
  const [passwordOption, setPasswordOption] = useState<'auto' | 'custom'>('auto');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    if (password.length >= 16) return true;
    if (password.length < 8) return false;
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (passwordOption === 'custom') {
      if (!customPassword) {
        setError('Password is required');
        return;
      }
      if (!validatePassword(customPassword)) {
        setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
        return;
      }
    }

    try {
      setIsLoading(true);
      
      const accessData: any = {
        email: email.trim(),
        sendEmail,
      };

      if (passwordOption === 'custom') {
        accessData.password = customPassword;
      }

      await employeesService.grantSystemAccess(employeeId, accessData);

      toast.success('System access granted successfully');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMessage = handleApiError(err, {
        toast,
        defaultMessage: 'Failed to grant access',
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail(employeeEmail || '');
      setPasswordOption('auto');
      setCustomPassword('');
      setShowPassword(false);
      setSendEmail(true);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Grant System Access
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create login credentials for {employeeName}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@company.com"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50"
                required
              />
            </div>

            {/* Password Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="space-y-3">
                {/* Auto-generate option */}
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="radio"
                    name="passwordOption"
                    value="auto"
                    checked={passwordOption === 'auto'}
                    onChange={(e) => setPasswordOption(e.target.value as 'auto')}
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Auto-generate password
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Generate a secure 16-character password
                    </div>
                  </div>
                </label>

                {/* Custom password option */}
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="radio"
                    name="passwordOption"
                    value="custom"
                    checked={passwordOption === 'custom'}
                    onChange={(e) => setPasswordOption(e.target.value as 'custom')}
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      Set custom password
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Must be 8+ characters with uppercase, lowercase, number, and special character
                    </div>
                    {passwordOption === 'custom' && (
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Enter password"
                          disabled={isLoading}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Send Email Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Send login credentials via email
              </span>
            </label>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-800 rounded-b-lg">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isLoading ? 'Granting Access...' : 'Grant Access'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

