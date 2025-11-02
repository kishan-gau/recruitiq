import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function MetricCard({ label, value, trend, icon: Icon, format = 'number' }) {
  const formatValue = (val) => {
    if (val === undefined || val === null) return '—'
    if (format === 'currency') {
      return `$${val.toLocaleString()}`
    }
    return val.toLocaleString()
  }

  const getTrendIcon = () => {
    if (!trend) return null
    const trendValue = parseFloat(trend)
    if (trendValue > 0) return <TrendingUp className="w-4 h-4" />
    if (trendValue < 0) return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    const trendValue = parseFloat(trend)
    if (trendValue > 0) return 'text-success-600'
    if (trendValue < 0) return 'text-danger-600'
    return 'text-gray-600'
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{formatValue(value)}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-1">{trend}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-primary-50 rounded-lg">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        )}
      </div>
    </div>
  )
}
