import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Users, TrendingUp, Settings, ExternalLink } from 'lucide-react';
import { portalService } from '../../services';
import toast from 'react-hot-toast';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const response = await portalService.getProducts();
      setProducts(response.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      beta: 'bg-blue-100 text-blue-800',
      alpha: 'bg-purple-100 text-purple-800',
      inactive: 'bg-gray-100 text-gray-800',
      deprecated: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-1">
            Manage products and their features across the platform
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {products.filter(p => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Core Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {products.filter(p => p.isCore).length}
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
              <p className="text-sm text-gray-600">Add-on Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {products.filter(p => p.requiresLicense).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">No products found</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Product Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: product.color || '#6366f1' }}
                    >
                      {product.displayName?.[0] || product.name?.[0] || 'P'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {product.displayName || product.name}
                      </h3>
                      <p className="text-sm text-gray-500">{product.slug}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(product.status)}`}>
                    {product.status}
                  </span>
                </div>

                {/* Product Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {product.description}
                </p>

                {/* Product Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
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
                  {product.minTier && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      Min: {product.minTier}
                    </span>
                  )}
                </div>

                {/* Product Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Features</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {product.features?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Version</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {product.version || '-'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    to={`/products/${product.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    <Settings size={16} />
                    View Details
                  </Link>
                  {product.basePath && (
                    <a
                      href={product.basePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      title="View Product"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
