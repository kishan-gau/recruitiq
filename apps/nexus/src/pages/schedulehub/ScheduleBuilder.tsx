import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, Plus, X, Save, ArrowLeft } from 'lucide-react';
import { useCreateSchedule, useRoles, useStations } from '@/hooks/schedulehub/useScheduleStats';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Role, Station } from '@/types/schedulehub';

interface ShiftTemplate {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roleId: string;
  stationId: string;
  workersNeeded: number;
}

export default function ScheduleBuilder() {
  const navigate = useNavigate();
  const createSchedule = useCreateSchedule();
  const { data: rolesData } = useRoles();
  const { data: stationsData } = useStations();

  const roles = (rolesData?.roles || []) as Role[];
  const stations = (stationsData?.stations || []) as Station[];

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [currentShift, setCurrentShift] = useState<Partial<ShiftTemplate>>({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    workersNeeded: 1,
  });

  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showFormValidationDialog, setShowFormValidationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleShiftChange = (field: string, value: any) => {
    setCurrentShift(prev => ({ ...prev, [field]: value }));
  };

  const addShift = () => {
    if (!currentShift.roleId || !currentShift.stationId) {
      setShowValidationDialog(true);
      return;
    }

    const newShift: ShiftTemplate = {
      id: `shift-${Date.now()}`,
      dayOfWeek: currentShift.dayOfWeek || 1,
      startTime: currentShift.startTime || '09:00',
      endTime: currentShift.endTime || '17:00',
      roleId: currentShift.roleId || '',
      stationId: currentShift.stationId || '',
      workersNeeded: currentShift.workersNeeded || 1,
    };

    setShifts(prev => [...prev, newShift]);
    setCurrentShift({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      workersNeeded: 1,
    });
  };

  const removeShift = (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();

    if (!formData.name || !formData.startDate || !formData.endDate) {
      setShowFormValidationDialog(true);
      return;
    }

    try {
      const scheduleData = {
        ...formData,
        status: asDraft ? 'draft' : 'published',
        shifts: shifts.map(s => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          roleId: s.roleId,
          stationId: s.stationId,
          workersNeeded: s.workersNeeded,
        })),
      };

      await createSchedule.mutateAsync(scheduleData);
      setSuccessMessage(`Schedule ${asDraft ? 'saved as draft' : 'created and published'} successfully!`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error creating schedule:', error);
      setShowErrorDialog(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/schedulehub/schedules')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Schedules
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create New Schedule
          </h1>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Information
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="e.g., Week of Nov 7-13"
                />
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Additional notes or instructions..."
              />
            </div>
          </div>

          {/* Shift Templates */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Shift Templates
            </h2>

            {/* Add Shift Form */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Add Shift Template
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Day of Week
                  </label>
                  <select
                    value={currentShift.dayOfWeek}
                    onChange={(e) => handleShiftChange('dayOfWeek', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={currentShift.startTime}
                    onChange={(e) => handleShiftChange('startTime', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={currentShift.endTime}
                    onChange={(e) => handleShiftChange('endTime', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Shift Role *
                  </label>
                  <select
                    value={currentShift.roleId || ''}
                    onChange={(e) => handleShiftChange('roleId', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <option value="">Select a shift role...</option>
                    {roles.filter(role => role.is_active).map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Station *
                  </label>
                  <select
                    value={currentShift.stationId || ''}
                    onChange={(e) => handleShiftChange('stationId', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <option value="">Select a station...</option>
                    {stations.filter(station => station.is_active).map(station => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Workers Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentShift.workersNeeded}
                    onChange={(e) => handleShiftChange('workersNeeded', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addShift}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Shift
              </button>
            </div>

            {/* Shifts List */}
            {shifts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Added Shifts ({shifts.length})
                </h3>
                <div className="space-y-2">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                    >
                      <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {daysOfWeek.find(d => d.value === shift.dayOfWeek)?.label}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Shift Role: {roles.find(r => r.id === shift.roleId)?.name || shift.roleId}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Station: {stations.find(s => s.id === shift.stationId)?.name || shift.stationId}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {shift.workersNeeded}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeShift(shift.id)}
                        className="ml-4 text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={createSchedule.isPending}
              className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={createSchedule.isPending || shifts.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSchedule.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create & Publish
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Validation Dialog */}
      <ConfirmDialog
        isOpen={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        onConfirm={() => setShowValidationDialog(false)}
        title="Missing Shift Details"
        message="Please fill in all shift details (Shift Role and Station) before adding the shift."
        confirmText="OK"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={showFormValidationDialog}
        onClose={() => setShowFormValidationDialog(false)}
        onConfirm={() => setShowFormValidationDialog(false)}
        title="Missing Required Fields"
        message="Please fill in all required fields (Name, Start Date, and End Date) before creating the schedule."
        confirmText="OK"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigate('/schedulehub/schedules');
        }}
        onConfirm={() => {
          setShowSuccessDialog(false);
          navigate('/schedulehub/schedules');
        }}
        title="Success"
        message={successMessage}
        confirmText="OK"
        variant="info"
      />

      <ConfirmDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        onConfirm={() => setShowErrorDialog(false)}
        title="Error"
        message="Failed to create schedule. Please try again."
        confirmText="OK"
        variant="danger"
      />
    </div>
  );
}
