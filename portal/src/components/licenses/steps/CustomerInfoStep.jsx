/**
 * Customer Information Step Component
 */

export default function CustomerInfoStep({ formData, onChange, errors = {} }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
      
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
  );
}
