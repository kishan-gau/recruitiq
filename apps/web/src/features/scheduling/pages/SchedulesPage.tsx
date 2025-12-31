import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  CalendarView,
  // ShiftManagement,  // TODO: Create component
  // WorkerScheduling  // TODO: Create component
} from '@features/scheduling/components';
import { useErrorHandler } from '@/hooks';

export default function SchedulesPage() {
  const navigate = useNavigate();
  const { view = 'calendar' } = useParams<{ view?: string }>();
  const handleError = useErrorHandler();

  // Placeholder components for views that haven't been implemented yet
  const PlaceholderComponent = ({ title }: { title: string }) => (
    <div className="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <p className="text-slate-600 dark:text-slate-400">{title} - Coming Soon</p>
    </div>
  );

  const views = [
    { id: 'calendar', label: 'Calendar View', component: CalendarView },
    { id: 'shifts', label: 'Shift Management', component: () => <PlaceholderComponent title="Shift Management" /> },
    { id: 'workers', label: 'Worker Scheduling', component: () => <PlaceholderComponent title="Worker Scheduling" /> }
  ];

  const currentView = views.find(v => v.id === view) || views[0];

  const handleViewChange = (viewId: string) => {
    navigate(`/scheduling/schedules/${viewId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with View Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Schedule Management
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Create, manage, and optimize workforce schedules
          </p>
        </div>
      </div>

      {/* View Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentView.id === view.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {view.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Current View Component */}
      <div className="min-h-[600px]">
        <currentView.component />
      </div>
    </div>
  );
}