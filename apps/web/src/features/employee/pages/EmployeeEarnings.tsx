import { useState } from 'react';
import { DollarSign, TrendingUp, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePayStructure, useYTDEarnings, useDeductions, useAllowances } from '../hooks';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Employee Earnings Page
 * Mobile-optimized earnings breakdown and transparency
 * 
 * Features:
 * - Earnings summary card
 * - Expandable breakdown sections
 * - YTD comparisons
 * - Visual representation
 */
export default function EmployeeEarnings() {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: payStructure, isLoading: payLoading } = usePayStructure(user?.employeeId || '');
  const { data: ytdData } = useYTDEarnings(user?.employeeId || '');
  const { data: deductions } = useDeductions(user?.employeeId || '');
  const { data: allowances } = useAllowances(user?.employeeId || '');

  if (payLoading && !payStructure) {
    return <LoadingSpinner />;
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const grossPay = payStructure?.baseSalary || 0;
  const totalAllowances = allowances?.reduce((sum: number, a: any) => sum + (a.amount || 0), 0) || 0;
  const totalDeductions = deductions?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0;
  const netPay = grossPay + totalAllowances - totalDeductions;

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          My Earnings
        </h1>
        <p className="text-sm opacity-90 mt-2">
          Detailed compensation breakdown
        </p>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-6 shadow-lg">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm opacity-90">Gross Pay</span>
              <span className="text-xl font-bold">${grossPay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm opacity-90">Deductions</span>
              <span className="text-xl font-bold text-red-200">-${totalDeductions.toFixed(2)}</span>
            </div>
            <div className="h-px bg-white/20"></div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Net Pay</span>
              <span className="text-2xl font-bold">${netPay.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <button
            onClick={() => toggleSection('earnings')}
            className="w-full p-4 flex items-center justify-between touch-manipulation"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Earnings Breakdown
            </h2>
            {expandedSection === 'earnings' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {expandedSection === 'earnings' && (
            <div className="px-4 pb-4 space-y-3 border-t border-border">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Base Salary</span>
                <span className="font-semibold">${(payStructure?.baseSalary || 0).toFixed(2)}</span>
              </div>

              {allowances && allowances.length > 0 && (
                <>
                  <div className="text-sm font-medium text-muted-foreground pt-2">Allowances</div>
                  {allowances.map((allowance: any) => (
                    <div key={allowance.id} className="flex justify-between py-1 pl-4">
                      <span className="text-sm text-muted-foreground">{allowance.name}</span>
                      <span className="text-sm font-medium">${(allowance.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}

              {payStructure?.bonuses && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Bonuses</span>
                  <span className="font-semibold">${(payStructure.bonuses || 0).toFixed(2)}</span>
                </div>
              )}

              {payStructure?.overtime && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Overtime</span>
                  <span className="font-semibold">${(payStructure.overtime || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between py-2 font-semibold">
                <span>Total Earnings</span>
                <span className="text-green-600">${(grossPay + totalAllowances).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Deductions Breakdown */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <button
            onClick={() => toggleSection('deductions')}
            className="w-full p-4 flex items-center justify-between touch-manipulation"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              Deductions
            </h2>
            {expandedSection === 'deductions' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {expandedSection === 'deductions' && (
            <div className="px-4 pb-4 space-y-3 border-t border-border">
              {deductions && deductions.length > 0 ? (
                <>
                  {deductions.map((deduction: any) => (
                    <div key={deduction.id} className="flex justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{deduction.name}</span>
                        {deduction.description && (
                          <Info className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-semibold text-red-600">-${(deduction.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between py-2 font-semibold">
                    <span>Total Deductions</span>
                    <span className="text-red-600">-${totalDeductions.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <p className="text-center py-4 text-muted-foreground">No deductions</p>
              )}
            </div>
          )}
        </div>

        {/* YTD Summary */}
        {ytdData && (
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Year-to-Date Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Gross</span>
                <span className="font-semibold">${(ytdData.grossPay || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Deductions</span>
                <span className="font-semibold text-red-600">-${(ytdData.totalDeductions || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Net</span>
                <span className="font-semibold text-green-600">${(ytdData.netPay || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
