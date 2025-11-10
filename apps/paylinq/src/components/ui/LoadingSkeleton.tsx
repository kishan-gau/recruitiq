/**
 * Loading Skeleton Components
 * 
 * Reusable skeleton loaders for different content types:
 * - TableSkeleton: For data tables
 * - CardSkeleton: For card layouts
 * - FormSkeleton: For form pages
 * - DetailsSkeleton: For detail pages
 */

interface SkeletonProps {
  className?: string;
}

// Base skeleton element
export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{ animationDuration: '1.5s' }}
  />
);

// Table skeleton loader
export const TableSkeleton = () => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Filters */}
    <div className="flex space-x-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-48" />
    </div>

    {/* Table */}
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex space-x-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Table rows */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="border-b border-gray-200 px-6 py-4">
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Card skeleton loader
export const CardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
    <div className="flex space-x-2">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
  </div>
);

// Grid of cards
export const CardGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {[...Array(count)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Form skeleton loader
export const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-24" />
    </div>

    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Form section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Another section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  </div>
);

// Details page skeleton
export const DetailsSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* Stats cards */}
    <CardGridSkeleton count={4} />

    {/* Main content */}
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex space-x-6">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
    </div>

    {/* Stats */}
    <CardGridSkeleton count={4} />

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <CardSkeleton />
      </div>
      <div>
        <CardSkeleton />
      </div>
    </div>
  </div>
);
