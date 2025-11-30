import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import AvailabilityCalendar from '@/components/scheduling/AvailabilityCalendar';
import Button from '@/components/ui/Button';
import { Calendar, Users, TrendingUp } from 'lucide-react';

export default function AvailabilityManagement() {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Availability Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage employee availability, shifts, and scheduling
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Reports
            </Button>
            <Button variant="primary" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Bulk Actions
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
              Employee Availability
            </TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflicts & Issues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <AvailabilityCalendar />
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Employee Availability List
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  View and manage individual employee availability schedules
                </p>
                <Button variant="primary">
                  View Employee List
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conflicts">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Conflicts Found
                </h3>
                <p className="text-sm text-gray-500">
                  All availability schedules are properly configured
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
