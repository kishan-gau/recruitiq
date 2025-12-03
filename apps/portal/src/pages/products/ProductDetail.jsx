import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Users, Settings, Plus, Edit, Eye } from 'lucide-react';
import { portalService } from '../../services';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [productRes, featuresRes] = await Promise.all([
        portalService.getProduct(id),
        portalService.getFeatures({ productId: id, limit: 100 })
      ]);

      setProduct(productRes.product);
      setFeatures(featuresRes.features || []);
    } catch (error) {
      console.error('Failed to fetch product data:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
        <Link to="/products" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          ← Back to Products
        </Link>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      stable: 'bg-green-100 text-green-800',
      beta: 'bg-blue-100 text-blue-800',
      alpha: 'bg-purple-100 text-purple-800',
      deprecated: 'bg-red-100 text-red-800',
      disabled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const featuresByStatus = {
    stable: features.filter(f => f.status === 'stable').length,
    beta: features.filter(f => f.status === 'beta').length,
    alpha: features.filter(f => f.status === 'alpha').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: product.color || '#6366f1' }}
            >
              {product.displayName?.[0] || product.name?.[0] || 'P'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.displayName || product.name}</h1>
              <p className="text-gray-600 mt-1">{product.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-blue-600" size={20} />
            <span className="text-sm text-gray-600">Status</span>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(product.status)}`}>
            {product.status}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-green-600" size={20} />
            <span className="text-sm text-gray-600">Features</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{product.featureCount || features.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-purple-600" size={20} />
            <span className="text-sm text-gray-600">Organizations</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{product.organizationCount || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-amber-600" size={20} />
            <span className="text-sm text-gray-600">Version</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{product.version || '-'}</p>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Slug</p>
            <p className="text-gray-900 font-mono">{product.slug}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-1">API Prefix</p>
            <p className="text-gray-900 font-mono">{product.apiPrefix}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Base Path</p>
            <p className="text-gray-900 font-mono">{product.basePath || '-'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Minimum Tier</p>
            <p className="text-gray-900">{product.minTier || 'Any'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Type</p>
            <div className="flex gap-2">
              {product.isCore && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  Core
                </span>
              )}
              {product.requiresLicense && (
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                  Requires License
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Created At</p>
            <p className="text-gray-900">{new Date(product.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Feature Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Status Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 mb-1">Stable Features</p>
            <p className="text-3xl font-bold text-green-700">{featuresByStatus.stable}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">Beta Features</p>
            <p className="text-3xl font-bold text-blue-700">{featuresByStatus.beta}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600 mb-1">Alpha Features</p>
            <p className="text-3xl font-bold text-purple-700">{featuresByStatus.alpha}</p>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Features</h3>
          <Link
            to="/features/create"
            state={{ productId: id }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            <Plus size={16} />
            Add Feature
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Min Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Organizations
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No features found for this product
                  </td>
                </tr>
              ) : (
                features.map((feature) => (
                  <tr key={feature.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{feature.featureName}</div>
                        <div className="text-sm text-gray-500">{feature.featureKey}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(feature.status)}`}>
                        {feature.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {feature.category ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          {feature.category.replace(/_/g, ' ')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {feature.minTier || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        feature.isAddOn ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {feature.isAddOn ? 'Add-on' : 'Included'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {feature.organizationsUsing || 0}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                      <Link
                        to={`/features/${feature.id}`}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        to={`/features/${feature.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                      >
                        <Edit size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
