import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  User,
  AlertCircle,
  FileText,
  Award,
  Clock,
  Shield,
} from 'lucide-react';
import { useEmployee, useTerminateEmployee } from '@/hooks/useEmployees';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';
import SystemAccessPanel from '@/components/employee/SystemAccessPanel';

type TabType = 'overview' | 'personal' | 'employment' | 'contracts' | 'performance' | 'time-off' | 'system-access';

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  const { data: employee, isLoading, error } = useEmployee(id!);
  const { mutate: terminateEmployee, isPending: isTerminating } = useTerminateEmployee();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading employee"></div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-400">
              Employee Not Found
            </h3>
            <p className="text-red-700 dark:text-red-400">
              {error?.message || 'The requested employee could not be found.'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link
            to="/employees"
            className="text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            ← Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  const handleTerminate = () => {
    terminateEmployee(
      {
        id: employee.id,
        data: {
          terminationDate: new Date().toISOString().split('T')[0],
        },
      },
      {
        onSuccess: () => {
          toast.success('Employee terminated successfully');
          setShowTerminateModal(false);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to terminate employee');
        },
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'terminated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'suspended':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'performance', label: 'Performance', icon: Award },
    { id: 'time-off', label: 'Time Off', icon: Clock },
    { id: 'system-access', label: 'System Access', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Employees
        </button>
        <Link to={`/employees/${employee.id}/edit`}>
          <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors">
            <Edit className="w-5 h-5 mr-2" />
            Edit Employee
          </button>
        </Link>
      </div>

      {/* Employee Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-purple-500"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {employee.profilePhotoUrl ? (
                <img
                  src={employee.profilePhotoUrl}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  className="w-32 h-32 rounded-xl border-4 border-white dark:border-slate-900 object-cover shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl border-4 border-white dark:border-slate-900 bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </div>
              )}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {employee.firstName} {employee.lastName}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-600 dark:text-slate-400">
                    {employee.jobTitle || 'No Title'}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                      employee.employmentStatus
                    )}`}
                  >
                    {employee.employmentStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {employee.email}
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {employee.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">#{employee.employeeNumber}</span>
                  </div>
                </div>
              </div>
            </div>
            {employee.employmentStatus === 'active' && (
              <button
                onClick={() => setShowTerminateModal(true)}
                className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Terminate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employment Information */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Employment Information
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Job Title</dt>
                  <dd className="text-slate-900 dark:text-white font-medium">
                    {employee.jobTitle || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Department</dt>
                  <dd className="text-slate-900 dark:text-white font-medium">
                    {employee.department?.departmentName || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Location</dt>
                  <dd className="text-slate-900 dark:text-white font-medium">
                    {employee.location?.locationName || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Employment Type</dt>
                  <dd className="text-slate-900 dark:text-white font-medium">
                    {employee.employmentType.replace('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Hire Date</dt>
                  <dd className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(employee.hireDate), 'MMMM d, yyyy')}
                  </dd>
                </div>
                {employee.manager && (
                  <div>
                    <dt className="text-sm text-slate-600 dark:text-slate-400">Reports To</dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {employee.manager.firstName} {employee.manager.lastName}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact Information
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Email</dt>
                  <dd className="text-slate-900 dark:text-white font-medium">
                    <a
                      href={`mailto:${employee.email}`}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      {employee.email}
                    </a>
                  </dd>
                </div>
                {employee.phone && (
                  <div>
                    <dt className="text-sm text-slate-600 dark:text-slate-400">Phone</dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      <a
                        href={`tel:${employee.phone}`}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {employee.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {employee.mobilePhone && (
                  <div>
                    <dt className="text-sm text-slate-600 dark:text-slate-400">Mobile</dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      <a
                        href={`tel:${employee.mobilePhone}`}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {employee.mobilePhone}
                      </a>
                    </dd>
                  </div>
                )}
                {(employee.addressLine1 || employee.city) && (
                  <div>
                    <dt className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Address
                    </dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {employee.addressLine1 && <div>{employee.addressLine1}</div>}
                      {employee.addressLine2 && <div>{employee.addressLine2}</div>}
                      {employee.city && (
                        <div>
                          {employee.city}
                          {employee.stateProvince && `, ${employee.stateProvince}`}{' '}
                          {employee.postalCode}
                        </div>
                      )}
                      {employee.country && <div>{employee.country}</div>}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Emergency Contact */}
            {employee.emergencyContactName && (
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Emergency Contact
                </h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-slate-600 dark:text-slate-400">Name</dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {employee.emergencyContactName}
                    </dd>
                  </div>
                  {employee.emergencyContactRelationship && (
                    <div>
                      <dt className="text-sm text-slate-600 dark:text-slate-400">Relationship</dt>
                      <dd className="text-slate-900 dark:text-white font-medium">
                        {employee.emergencyContactRelationship}
                      </dd>
                    </div>
                  )}
                  {employee.emergencyContactPhone && (
                    <div>
                      <dt className="text-sm text-slate-600 dark:text-slate-400">Phone</dt>
                      <dd className="text-slate-900 dark:text-white font-medium">
                        <a
                          href={`tel:${employee.emergencyContactPhone}`}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          {employee.emergencyContactPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Skills & Bio */}
            {(employee.bio || employee.skills) && (
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  About
                </h2>
                {employee.bio && (
                  <p className="text-slate-700 dark:text-slate-300 mb-4">{employee.bio}</p>
                )}
                {employee.skills && employee.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {employee.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
              Personal Information
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm text-slate-600 dark:text-slate-400">Full Name</dt>
                <dd className="text-slate-900 dark:text-white font-medium mt-1">
                  {employee.firstName} {employee.middleName || ''} {employee.lastName}
                </dd>
              </div>
              {employee.preferredName && (
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Preferred Name</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-1">
                    {employee.preferredName}
                  </dd>
                </div>
              )}
              {employee.dateOfBirth && (
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Date of Birth</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-1">
                    {format(new Date(employee.dateOfBirth), 'MMMM d, yyyy')}
                  </dd>
                </div>
              )}
              {employee.gender && (
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Gender</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-1">
                    {employee.gender.replace('_', ' ')}
                  </dd>
                </div>
              )}
              {employee.nationality && (
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Nationality</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-1">
                    {employee.nationality}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {activeTab === 'employment' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
              Employment Details
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm text-slate-600 dark:text-slate-400">Employee Number</dt>
                <dd className="text-slate-900 dark:text-white font-medium mt-1">
                  {employee.employeeNumber}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-600 dark:text-slate-400">Employment Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                      employee.employmentStatus
                    )}`}
                  >
                    {employee.employmentStatus.replace('_', ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-600 dark:text-slate-400">Employment Type</dt>
                <dd className="text-slate-900 dark:text-white font-medium mt-1">
                  {employee.employmentType.replace('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-600 dark:text-slate-400">Hire Date</dt>
                <dd className="text-slate-900 dark:text-white font-medium mt-1">
                  {format(new Date(employee.hireDate), 'MMMM d, yyyy')}
                </dd>
              </div>
              {employee.terminationDate && (
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Termination Date</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-1">
                    {format(new Date(employee.terminationDate), 'MMMM d, yyyy')}
                  </dd>
                </div>
              )}
              {employee.workSchedule && (
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">Work Schedule</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-1">
                    {employee.workSchedule}
                  </dd>
                </div>
              )}
              {employee.ftePercentage && (
                <div>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">FTE Percentage</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-1">
                    {employee.ftePercentage}%
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Placeholders for other tabs */}
        {activeTab === 'contracts' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 text-center py-12">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Contracts
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Contract management coming soon
            </p>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 text-center py-12">
            <Award className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Performance Reviews
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Performance tracking coming soon
            </p>
          </div>
        )}

        {activeTab === 'time-off' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 text-center py-12">
            <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Time Off History
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Time off tracking coming soon
            </p>
          </div>
        )}

        {activeTab === 'system-access' && (
          <SystemAccessPanel
            employeeId={employee.id}
            employeeName={`${employee.firstName} ${employee.lastName}`}
            employeeEmail={employee.email}
          />
        )}
      </div>

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Terminate Employee
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to terminate {employee.firstName} {employee.lastName}? This
              action will set their status to terminated as of today.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTerminateModal(false)}
                disabled={isTerminating}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                disabled={isTerminating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isTerminating ? 'Terminating...' : 'Terminate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
