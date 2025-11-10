import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users, TrendingUp } from 'lucide-react';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export default function FeatureCatalog() {
  const [features, setFeatures] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchData();
  }, [selectedProduct, selectedStatus, selectedCategory]);

  async function fetchData() {
    setLoading(true);
    try {
      const [featuresRes, productsRes] = await Promise.all([
        apiService.getFeatures({
          productId: selectedProduct !== 'all' ? selectedProduct : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          limit: 100
        }),
        apiService.getProducts()
      ]);
      
      setFeatures(featuresRes.features || []);
      setProducts(productsRes.products || []);
    } catch (error) {
      console.error('Failed to fetch features:', error);
      toast.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  }

  const filteredFeatures = features.filter(feature =>
    feature.featureName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    feature.featureKey?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const colors = {
      stable: 'bg-green-100 text-green-800',
      beta: 'bg-blue-100 text-blue-800',
      alpha: 'bg-purple-100 text-purple-800',
      deprecated: 'bg-gray-100 text-gray-800',
      disabled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (isAddOn) => {
    return isAddOn
      ? 'bg-amber-100 text-amber-800'
      : 'bg-blue-100 text-blue-800';
  };

  // Extract unique categories from features
  const categories = [...new Set(features.map(f => f.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Catalog</h1>
          <p className="text-gray-600 mt-1">
            Manage product features and availability across the platform
          </p>
        </div>
        <Link
          to="/features/create"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Create Feature
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Filter className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Features</p>
              <p className="text-2xl font-bold text-gray-900">{features.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stable Features</p>
              <p className="text-2xl font-bold text-gray-900">
                {features.filter(f => f.status === 'stable').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Beta Features</p>
              <p className="text-2xl font-bold text-gray-900">
                {features.filter(f => f.status === 'beta').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Add-ons</p>
              <p className="text-2xl font-bold text-gray-900">
                {features.filter(f => f.isAddOn).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Product Filter */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Products</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.displayName || product.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="stable">Stable</option>
            <option value="beta">Beta</option>
            <option value="alpha">Alpha</option>
            <option value="deprecated">Deprecated</option>
            <option value="disabled">Disabled</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Features Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organizations
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  Loading features...
                </td>
              </tr>
            ) : filteredFeatures.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No features found
                </td>
              </tr>
            ) : (
              filteredFeatures.map((feature) => (
                <tr key={feature.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {feature.featureName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {feature.featureKey}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {feature.productName || feature.productSlug}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(feature.status)}`}>
                      {feature.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {feature.minTier || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadge(feature.isAddOn)}`}>
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
  );
}
