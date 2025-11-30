import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AvailabilityCalendar from '../../components/schedulehub/AvailabilityCalendar';
import AvailabilityStats from '../../components/schedulehub/AvailabilityStats';
import BulkAvailabilityForm from '../../components/schedulehub/BulkAvailabilityForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';

const AvailabilityManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats' | 'bulk'>('calendar');

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to view availability.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Availability Management</h1>
          <p className="text-gray-600 mt-1">
            Manage employee availability for scheduling
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <div className="bg-white rounded-lg shadow p-6">
            <AvailabilityCalendar />
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="bg-white rounded-lg shadow p-6">
            <AvailabilityStats />
          </div>
        </TabsContent>

        <TabsContent value="bulk">
          <div className="bg-white rounded-lg shadow p-6">
            <BulkAvailabilityForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AvailabilityManagement;
