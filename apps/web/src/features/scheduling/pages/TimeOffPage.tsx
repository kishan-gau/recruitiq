import React from 'react';

import { TimeOffManagement } from '@features/scheduling/components';

export default function TimeOffPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Time Off Management
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage employee time off requests and approvals
          </p>
        </div>
      </div>

      {/* Time Off Management Component */}
      <div className="min-h-[600px]">
        <TimeOffManagement />
      </div>
    </div>
  );
}