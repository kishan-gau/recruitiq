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
  History,
  UserPlus,
} from 'lucide-react';
import { useEmployee, useTerminateEmployee, useRehireEmployee, useEmploymentHistory, useRehireEligibility } from '@/hooks/useEmployees';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';
import SystemAccessPanel from '@/components/employee/SystemAccessPanel';

type TabType = 'overview' | 'personal' | 'employment' | 'contracts' | 'performance' | 'time-off' | 'system-access' | 'history';

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [terminationData, setTerminationData] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: 'resignation',
    terminationNotes: '',
    isRehireEligible: true,
  });
  const [rehireData, setRehireData] = useState({
    rehireDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'active',
    rehireNotes: '',
  });

  const { data: employee, isLoading, error } = useEmployee(id!);
  const { mutate: terminateEmployee, isPending: isTerminating } = useTerminateEmployee();
  const { mutate: rehireEmployee, isPending: isRehiring } = useRehireEmployee();
  const { data: employmentHistory = [], isLoading: isLoadingHistory } = useEmploymentHistory(id!);
  const { data: rehireEligibility } = useRehireEligibility(id!);

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
        data: terminationData,
      },
      {
        onSuccess: () => {
          toast.success('Employee terminated successfully');
          setShowTerminateModal(false);
          setTerminationData({
            terminationDate: new Date().toISOString().split('T')[0],
            terminationReason: 'resignation',
            terminationNotes: '',
            isRehireEligible: true,
          });
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to terminate employee');
        },
      }
    );
  };

  const handleRehire = () => {
    rehireEmployee(
      {
        id: employee.id,
        data: rehireData,
      },
      {
        onSuccess: () => {
          toast.success('Employee rehired successfully');
          setShowRehireModal(false);
          setRehireData({
            rehireDate: new Date().toISOString().split('T')[0],
            employmentStatus: 'active',
            rehireNotes: '',
          });
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to rehire employee');
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
    { id: 'history', label: 'Employment History', icon: History },
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
            <div className="flex gap-2">
              {employee.employmentStatus === 'active' && (
                <button
                  onClick={() => setShowTerminateModal(true)}
                  className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Terminate
                </button>
              )}
              {employee.employmentStatus === 'terminated' && rehireEligibility?.eligible && (
                <button
                  onClick={() => setShowRehireModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Rehire
                </button>
              )}
            </div>
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

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Employment History
            </h3>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 spinner" aria-label="Loading history"></div>
              </div>
            ) : employmentHistory.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                No employment history records found.
              </p>
            ) : (
              <div className="space-y-4">
                {employmentHistory.map((record: any, index: number) => (
                  <div
                    key={record.id}
                    className={`border rounded-lg p-4 ${
                      record.is_current
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {record.is_rehire ? '🔄 Rehired' : '✨ Original Hire'}
                          </h4>
                          {record.is_current && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400 text-xs font-medium rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {record.job_title || 'No title'} • {record.department_name || 'No department'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {format(new Date(record.start_date), 'MMM d, yyyy')}
                        </div>
                        {record.end_date && (
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            to {format(new Date(record.end_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Status:</span>{' '}
                        <span className="font-medium text-slate-900 dark:text-white">
                          {record.employment_status}
                        </span>
                      </div>
                      {record.employment_type && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Type:</span>{' '}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {record.employment_type}
                          </span>
                        </div>
                      )}
                      {record.location_name && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Location:</span>{' '}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {record.location_name}
                          </span>
                        </div>
                      )}
                      {record.manager_name && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Manager:</span>{' '}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {record.manager_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {record.termination_reason && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            Termination:
                          </span>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {record.termination_reason.replace(/_/g, ' ')}
                            </span>
                            {record.is_rehire_eligible !== undefined && (
                              <span
                                className={`ml-2 text-xs ${
                                  record.is_rehire_eligible
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                ({record.is_rehire_eligible ? 'Rehire Eligible' : 'Not Rehire Eligible'})
                              </span>
                            )}
                            {record.termination_notes && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {record.termination_notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {record.rehire_notes && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Rehire Notes: </span>
                        <span className="text-sm text-slate-900 dark:text-white">{record.rehire_notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Terminate Employee
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Terminate {employee.firstName} {employee.lastName}'s employment.
            </p>
            
            <div className="space-y-4 mb-6">
              {/* Termination Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Termination Date
                </label>
                <input
                  type="date"
                  value={terminationData.terminationDate}
                  onChange={(e) => setTerminationData({ ...terminationData, terminationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Termination Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Termination Reason
                </label>
                <select
                  value={terminationData.terminationReason}
                  onChange={(e) => setTerminationData({ ...terminationData, terminationReason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="resignation">Resignation</option>
                  <option value="layoff">Layoff</option>
                  <option value="termination_with_cause">Termination With Cause</option>
                  <option value="termination_without_cause">Termination Without Cause</option>
                  <option value="mutual_agreement">Mutual Agreement</option>
                  <option value="retirement">Retirement</option>
                  <option value="contract_expiry">Contract Expiry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Termination Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={terminationData.terminationNotes}
                  onChange={(e) => setTerminationData({ ...terminationData, terminationNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Additional termination details..."
                />
              </div>

              {/* Rehire Eligibility */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rehireEligible"
                  checked={terminationData.isRehireEligible}
                  onChange={(e) => setTerminationData({ ...terminationData, isRehireEligible: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="rehireEligible" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Eligible for Rehire
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTerminateModal(false);
                  setTerminationData({
                    terminationDate: new Date().toISOString().split('T')[0],
                    terminationReason: 'resignation',
                    terminationNotes: '',
                    isRehireEligible: true,
                  });
                }}
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

      {/* Rehire Modal */}
      {showRehireModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Rehire Employee
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Rehire {employee.firstName} {employee.lastName} and reactivate their employment.
            </p>
            
            <div className="space-y-4 mb-6">
              {/* Rehire Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rehire Date
                </label>
                <input
                  type="date"
                  value={rehireData.rehireDate}
                  onChange={(e) => setRehireData({ ...rehireData, rehireDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Employment Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Employment Status
                </label>
                <select
                  value={rehireData.employmentStatus}
                  onChange={(e) => setRehireData({ ...rehireData, employmentStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              {/* Rehire Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={rehireData.rehireNotes}
                  onChange={(e) => setRehireData({ ...rehireData, rehireNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Reason for rehire, changes in role, etc..."
                />
              </div>

              {rehireEligibility && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-300">
                    <strong>Previous Termination:</strong> {rehireEligibility.terminationReason?.replace(/_/g, ' ')} on{' '}
                    {rehireEligibility.terminationDate && format(new Date(rehireEligibility.terminationDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRehireModal(false);
                  setRehireData({
                    rehireDate: new Date().toISOString().split('T')[0],
                    employmentStatus: 'active',
                    rehireNotes: '',
                  });
                }}
                disabled={isRehiring}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRehire}
                disabled={isRehiring}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
              >
                {isRehiring ? 'Rehiring...' : 'Rehire Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
