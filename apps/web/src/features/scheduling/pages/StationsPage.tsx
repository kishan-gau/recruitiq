import React from 'react';

import { StationManagement } from '@features/scheduling/components';

export default function StationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Station Management
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Configure and manage work stations and their requirements
          </p>
        </div>
      </div>

      {/* Station Management Component */}
      <div className="min-h-[600px]">
        <StationManagement />
      </div>
    </div>
  );
}