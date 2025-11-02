export default function ProgressBar({ current, limit, showPercentage = true, color = 'primary' }) {
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0
  const isUnlimited = limit === null || limit === undefined
  
  const getColorClass = () => {
    if (isUnlimited) return 'bg-gray-300'
    if (percentage >= 90) return 'bg-danger-500'
    if (percentage >= 75) return 'bg-warning-500'
    return 'bg-primary-500'
  }

  if (isUnlimited) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
          <div className="bg-gray-300 h-2 rounded-full" style={{ width: '100%' }}></div>
        </div>
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {current.toLocaleString()} / Unlimited
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
        <div
          className={`${getColorClass()} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className="text-sm text-gray-600 whitespace-nowrap">
        {current.toLocaleString()} / {limit.toLocaleString()}
        {showPercentage && ` (${Math.round(percentage)}%)`}
      </span>
    </div>
  )
}
