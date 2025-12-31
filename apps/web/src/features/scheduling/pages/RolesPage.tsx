import React from 'react';

import { RolesManagement } from '@features/scheduling/components';

export default function RolesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Role Management
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Configure worker roles, permissions, and scheduling requirements
          </p>
        </div>
      </div>

      {/* Role Management Component */}
      <div className="min-h-[600px]">
        <RolesManagement />
      </div>
    </div>
  );
}