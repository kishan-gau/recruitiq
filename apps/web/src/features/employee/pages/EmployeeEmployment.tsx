import { Briefcase, Calendar, User, MapPin, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentContract, useEmploymentHistory, useManagerInfo } from '../hooks';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Employee Employment Status Page
 * Mobile-optimized employment contract and history view
 * 
 * Features:
 * - Current employment details
 * - Manager information
 * - Employment history timeline
 */
export default function EmployeeEmployment() {
  const { user } = useAuth();
  
  const { data: contract, isLoading: contractLoading } = useCurrentContract(user?.employeeId || '');
  const { data: history } = useEmploymentHistory(user?.employeeId || '');
  const { data: manager } = useManagerInfo(user?.employeeId || '');

  if (contractLoading && !contract) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          My Employment
        </h1>
        <p className="text-sm opacity-90 mt-2">
          Employment details and history
        </p>
      </div>

      <div className="p-4 space-y-6 -mt-4">
        {/* Current Position Card */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Current Position</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-semibold">{contract?.position || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Employment Type</p>
                <p className="font-semibold capitalize">{contract?.employmentType || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-semibold">
                  {contract?.startDate ? new Date(contract.startDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-semibold">{contract?.department || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">{contract?.location || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contract Document */}
          {contract?.documentId && (
            <button className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2 touch-manipulation">
              <FileText className="h-4 w-4" />
              View Contract
            </button>
          )}
        </div>

        {/* Manager Info Card */}
        {manager && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Reports To
            </h2>
            
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold">
                {manager.name?.charAt(0) || 'M'}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{manager.name}</p>
                <p className="text-sm text-muted-foreground">{manager.position}</p>
              </div>
            </div>

            {manager.email && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{manager.email}</p>
              </div>
            )}
          </div>
        )}

        {/* Employment History */}
        {history && history.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <h2 className="font-semibold mb-4">Employment History</h2>
            
            <div className="space-y-4">
              {history.map((entry: any, index: number) => (
                <div key={entry.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${
                    index === 0 ? 'bg-primary' : 'bg-muted-foreground'
                  }`}></div>
                  
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-[5px] top-5 w-0.5 h-full bg-border"></div>
                  )}
                  
                  <div className={`pb-4 ${index === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <p className="font-semibold">{entry.position}</p>
                    <p className="text-sm">
                      {entry.department} • {entry.employmentType}
                    </p>
                    <p className="text-xs mt-1">
                      {new Date(entry.startDate).toLocaleDateString()} -{' '}
                      {entry.endDate ? new Date(entry.endDate).toLocaleDateString() : 'Present'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
