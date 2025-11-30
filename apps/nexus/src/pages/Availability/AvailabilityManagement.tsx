import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import AvailabilityCalendar from '@/components/Availability/AvailabilityCalendar';

export default function AvailabilityManagement() {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Availability Management</h1>
        <p className="text-gray-600 mt-2">
          Manage employee availability, time-off requests, and scheduling
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="requests">Time-Off Requests</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <AvailabilityCalendar />
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Time-Off Requests
              </h3>
              <p className="text-gray-600">
                This feature is coming soon. You'll be able to review and approve time-off requests here.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Schedule Overview
              </h3>
              <p className="text-gray-600">
                This feature is coming soon. You'll see a comprehensive schedule overview here.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
