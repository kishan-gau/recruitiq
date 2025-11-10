import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export default function FeatureForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);
  const preselectedProductId = location.state?.productId;
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productId: preselectedProductId || '',
    featureKey: '',
    featureName: '',
    description: '',
    category: '',
    status: 'beta',
    minTier: '',
    isAddOn: false,
    hasUsageLimit: false,
    defaultUsageLimit: '',
    usageLimitUnit: '',
    rolloutPercentage: 100,
    pricing: {
      monthly: '',
      annual: ''
    },
    requiredFeatures: '',
    conflictingFeatures: ''
  });

  useEffect(() => {
    fetchProducts();
    if (isEdit) {
      fetchFeature();
    }
  }, [id]);

  async function fetchProducts() {
    try {
      const response = await apiService.getProducts();
      setProducts(response.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }

  async function fetchFeature() {
    try {
      const response = await apiService.getFeature(id);
      const feature = response.feature;
      
      setFormData({
        productId: feature.productId,
        featureKey: feature.featureKey,
        featureName: feature.featureName,
        description: feature.description || '',
        category: feature.category || '',
        status: feature.status,
        minTier: feature.minTier || '',
        isAddOn: feature.isAddOn || false,
        hasUsageLimit: feature.hasUsageLimit || false,
        defaultUsageLimit: feature.defaultUsageLimit || '',
        usageLimitUnit: feature.usageLimitUnit || '',
        rolloutPercentage: feature.rolloutPercentage || 100,
        pricing: feature.pricing || { monthly: '', annual: '' },
        requiredFeatures: feature.requiredFeatures ? feature.requiredFeatures.join(', ') : '',
        conflictingFeatures: feature.conflictingFeatures ? feature.conflictingFeatures.join(', ') : ''
      });
    } catch (error) {
      console.error('Failed to fetch feature:', error);
      toast.error('Failed to load feature');
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('pricing.')) {
      const pricingField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          [pricingField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data
      const data = {
        ...formData,
        requiredFeatures: formData.requiredFeatures 
          ? formData.requiredFeatures.split(',').map(f => f.trim()).filter(Boolean)
          : [],
        conflictingFeatures: formData.conflictingFeatures
          ? formData.conflictingFeatures.split(',').map(f => f.trim()).filter(Boolean)
          : [],
        defaultUsageLimit: formData.defaultUsageLimit ? parseInt(formData.defaultUsageLimit) : null,
        rolloutPercentage: parseInt(formData.rolloutPercentage),
        pricing: formData.isAddOn && (formData.pricing.monthly || formData.pricing.annual) 
          ? {
              monthly: formData.pricing.monthly ? parseFloat(formData.pricing.monthly) : undefined,
              annual: formData.pricing.annual ? parseFloat(formData.pricing.annual) : undefined
            }
          : null
      };

      if (isEdit) {
        await apiService.updateFeature(id, data);
        toast.success('Feature updated successfully');
      } else {
        await apiService.createFeature(data);
        toast.success('Feature created successfully');
      }

      navigate('/features');
    } catch (error) {
      console.error('Failed to save feature:', error);
      toast.error(error.response?.data?.error || 'Failed to save feature');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/features')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Feature' : 'Create Feature'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update feature configuration' : 'Add a new feature to the catalog'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  required
                  disabled={isEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.displayName || product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feature Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feature Key *
                </label>
                <input
                  type="text"
                  name="featureKey"
                  value={formData.featureKey}
                  onChange={handleChange}
                  required
                  disabled={isEdit}
                  placeholder="e.g., advanced_analytics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (snake_case, cannot be changed)</p>
              </div>
            </div>

            {/* Feature Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature Name *
              </label>
              <input
                type="text"
                name="featureName"
                value={formData.featureName}
                onChange={handleChange}
                required
                placeholder="e.g., Advanced Analytics"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe what this feature does..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g., analytics, reporting"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="alpha">Alpha</option>
                  <option value="beta">Beta</option>
                  <option value="stable">Stable</option>
                  <option value="deprecated">Deprecated</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Access Control */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Access Control</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Min Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Tier
                </label>
                <select
                  name="minTier"
                  value={formData.minTier}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Any tier</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Rollout Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rollout Percentage
                </label>
                <input
                  type="number"
                  name="rolloutPercentage"
                  value={formData.rolloutPercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">0-100, controls gradual feature rollout</p>
              </div>
            </div>

            {/* Is Add-on */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isAddOn"
                checked={formData.isAddOn}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label className="text-sm font-medium text-gray-700">
                This is a paid add-on feature
              </label>
            </div>

            {/* Pricing (shown if add-on) */}
            {formData.isAddOn && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Price ($)
                  </label>
                  <input
                    type="number"
                    name="pricing.monthly"
                    value={formData.pricing.monthly}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Price ($)
                  </label>
                  <input
                    type="number"
                    name="pricing.annual"
                    value={formData.pricing.annual}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Usage Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Usage Limits</h3>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="hasUsageLimit"
                checked={formData.hasUsageLimit}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label className="text-sm font-medium text-gray-700">
                This feature has usage limits
              </label>
            </div>

            {formData.hasUsageLimit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Usage Limit
                  </label>
                  <input
                    type="number"
                    name="defaultUsageLimit"
                    value={formData.defaultUsageLimit}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g., 1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    name="usageLimitUnit"
                    value={formData.usageLimitUnit}
                    onChange={handleChange}
                    placeholder="e.g., api_calls_per_month"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Dependencies</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Features
              </label>
              <input
                type="text"
                name="requiredFeatures"
                value={formData.requiredFeatures}
                onChange={handleChange}
                placeholder="e.g., basic_analytics, data_export"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of feature keys</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conflicting Features
              </label>
              <input
                type="text"
                name="conflictingFeatures"
                value={formData.conflictingFeatures}
                onChange={handleChange}
                placeholder="e.g., legacy_reporting"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Features that cannot be active with this one</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            type="button"
            onClick={() => navigate('/features')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {loading ? 'Saving...' : (isEdit ? 'Update Feature' : 'Create Feature')}
          </button>
        </div>
      </form>
    </div>
  );
}
