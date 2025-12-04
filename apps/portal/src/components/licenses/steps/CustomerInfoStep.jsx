/**
 * Customer Information Step Component
 */
import { useState, useEffect } from 'react';
import { customersService } from '../../../services/customers.service';

export default function CustomerInfoStep({ formData, onChange, errors = {} }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await customersService.getCustomers({ status: 'active' });
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (e) => {
    const value = e.target.value;
    
    if (value === 'new') {
      setIsNewCustomer(true);
      onChange({ ...formData, customerId: null, name: '', contactName: '', contactEmail: '' });
    } else if (value) {
      setIsNewCustomer(false);
      const selectedCustomer = customers.find(c => c.id === value);
      if (selectedCustomer) {
        onChange({
          ...formData,
          customerId: selectedCustomer.id,
          name: selectedCustomer.name,
          contactName: selectedCustomer.contactName || '',
          contactEmail: selectedCustomer.contactEmail || ''
        });
      }
    } else {
      onChange({ ...formData, customerId: null, name: '', contactName: '', contactEmail: '' });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
      
      <div>
        <label className="label">
          Select Customer <span className="text-red-500">*</span>
        </label>
        <select
          className={`input ${errors.name ? 'border-red-500' : ''}`}
          value={isNewCustomer ? 'new' : (formData.customerId || '')}
          onChange={handleCustomerChange}
          disabled={loading}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'customer-error' : undefined}
        >
          <option value="">-- Select Customer --</option>
          <option value="new">➕ Create New Customer</option>
          {customers.map(customer => (
            <option key={customer.id} value={customer.id}>
              {customer.name} ({customer.contactEmail})
            </option>
          ))}
        </select>
        {errors.name && (
          <p id="customer-error" className="text-sm text-red-600 mt-1">{errors.name}</p>
        )}
        <p className="text-sm text-gray-600 mt-1">
          Select an existing customer or create a new one
        </p>
      </div>

      {isNewCustomer && (
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <h3 className="text-sm font-medium text-blue-900 mb-3">New Customer Details</h3>
          
          <div className="space-y-4">
            <div>
              <label className="label">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Acme Corp"
                value={formData.name}
                onChange={(e) => onChange({ ...formData, name: e.target.value })}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="label">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`input ${errors.contactName ? 'border-red-500' : ''}`}
                placeholder="John Smith"
                value={formData.contactName}
                onChange={(e) => onChange({ ...formData, contactName: e.target.value })}
                aria-invalid={!!errors.contactName}
                aria-describedby={errors.contactName ? 'contactName-error' : undefined}
              />
              {errors.contactName && (
                <p id="contactName-error" className="text-sm text-red-600 mt-1">{errors.contactName}</p>
              )}
            </div>

            <div>
              <label className="label">
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={`input ${errors.contactEmail ? 'border-red-500' : ''}`}
                placeholder="john@acmecorp.com"
                value={formData.contactEmail}
                onChange={(e) => onChange({ ...formData, contactEmail: e.target.value })}
                aria-invalid={!!errors.contactEmail}
                aria-describedby={errors.contactEmail ? 'contactEmail-error' : undefined}
              />
              {errors.contactEmail && (
                <p id="contactEmail-error" className="text-sm text-red-600 mt-1">{errors.contactEmail}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!isNewCustomer && formData.customerId && (
        <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
          <h3 className="text-sm font-medium text-green-900 mb-2">Selected Customer</h3>
          <div className="text-sm text-green-800 space-y-1">
            <p><span className="font-medium">Organization:</span> {formData.name}</p>
            <p><span className="font-medium">Contact:</span> {formData.contactName}</p>
            <p><span className="font-medium">Email:</span> {formData.contactEmail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
