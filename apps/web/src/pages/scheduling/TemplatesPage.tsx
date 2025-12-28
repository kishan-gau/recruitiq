import React from 'react';
import { ShiftTemplates } from '../../features/scheduling/components';

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Shift Templates
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Create and manage reusable shift templates for efficient scheduling
          </p>
        </div>
      </div>

      {/* Shift Templates Component */}
      <div className="min-h-[600px]">
        <ShiftTemplates />
      </div>
    </div>
  );
}