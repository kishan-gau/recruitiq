import { useState } from 'react';
import AvailabilityCalendar from './AvailabilityCalendar';
import Tabs from '@/components/ui/Tabs';
import { Calendar, List, AlertCircle } from 'lucide-react';

export default function AvailabilityManagement() {
  const [activeTab, setActiveTab] = useState('calendar');

  const tabs = [
    {
      id: 'calendar',
      label: 'Calendar View',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'list',
      label: 'Availability Rules',
      icon: <List className="w-4 h-4" />,
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      icon: <AlertCircle className="w-4 h-4" />,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Availability Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage worker availability schedules and time-off requests
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'calendar' && <AvailabilityCalendar />}
        
        {activeTab === 'list' && (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <List className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Availability Rules List View
              </h3>
              <p className="text-gray-600">
                List view of all availability rules coming soon...
              </p>
            </div>
          </div>
        )}
        
        {activeTab === 'exceptions' && (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Availability Exceptions
              </h3>
              <p className="text-gray-600">
                Manage one-time availability exceptions and time-off...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
