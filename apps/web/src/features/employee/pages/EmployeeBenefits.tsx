import { useState } from 'react';
import { Heart, DollarSign, Calendar, Info, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentBenefits, useEnrollmentStatus } from '../hooks';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Employee Benefits Page
 * Mobile-optimized benefits viewing and enrollment
 * 
 * Features:
 * - Current benefits display
 * - Enrollment status
 * - Benefit details
 */
export default function EmployeeBenefits() {
  const { user } = useAuth();
  const { data: currentBenefits, isLoading: benefitsLoading } = useCurrentBenefits(user?.employeeId || '');
  const { data: enrollmentStatus } = useEnrollmentStatus(user?.employeeId || '');

  if (benefitsLoading && !currentBenefits) {
    return <LoadingSpinner />;
  }

  const benefitCategories = currentBenefits ? Object.entries(
    currentBenefits.reduce((acc: any, benefit: any) => {
      const category = benefit.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(benefit);
      return acc;
    }, {})
  ) : [];

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6" />
          My Benefits
        </h1>
        <p className="text-sm opacity-90 mt-2">
          View your current benefit coverage
        </p>
      </div>

      <div className="p-4 space-y-6 -mt-4">
        {/* Enrollment Status Card */}
        {enrollmentStatus?.isEnrollmentOpen && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-1">Open Enrollment</h3>
                <p className="text-sm opacity-90">
                  Enrollment period ends {new Date(enrollmentStatus.enrollmentEndDate).toLocaleDateString()}
                </p>
              </div>
              <Calendar className="h-5 w-5" />
            </div>
            <button className="mt-3 w-full bg-white text-blue-600 rounded-lg py-2 font-semibold touch-manipulation">
              Enroll Now
            </button>
          </div>
        )}

        {/* Current Benefits by Category */}
        {benefitCategories.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No benefits enrolled</p>
          </div>
        ) : (
          benefitCategories.map(([category, benefits]: any) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {category}
              </h2>
              
              {benefits.map((benefit: any) => (
                <div
                  key={benefit.id}
                  className="bg-card rounded-lg border border-border p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{benefit.planName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {benefit.provider}
                      </p>
                    </div>
                    {benefit.isActive && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Coverage Details */}
                  <div className="space-y-2 text-sm">
                    {benefit.coverage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coverage:</span>
                        <span className="font-medium">{benefit.coverage}</span>
                      </div>
                    )}
                    {benefit.premium && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Premium:</span>
                        <span className="font-medium">
                          ${benefit.premium.toFixed(2)}/month
                        </span>
                      </div>
                    )}
                    {benefit.startDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-medium">
                          {new Date(benefit.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <button className="mt-3 w-full py-2 text-primary font-medium flex items-center justify-center gap-2 touch-manipulation">
                    <Info className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
