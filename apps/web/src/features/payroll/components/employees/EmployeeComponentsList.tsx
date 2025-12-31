/**
 * List component showing employee's assigned pay components
 * Formula-based component assignment system with forfaitair benefits
 */

import {
  Trash2,
  Calendar,
  DollarSign,
  Car,
  Home,
  Smartphone,
  Wifi,
  Package,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

import AssignEmployeeComponentModal from '@/components/modals/AssignEmployeeComponentModal';
import {
  useEmployeeComponentAssignments,
  useRemoveComponentAssignment,
} from '@/hooks';

interface EmployeeComponentsListProps {
  employeeId: string;
  employeeName?: string;
}

export default function EmployeeComponentsList({ employeeId, employeeName }: EmployeeComponentsListProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch data
  const {
    data: assignments,
    isLoading: isLoadingAssignments,
    error: assignmentsError,
  } = useEmployeeComponentAssignments(employeeId);

  const removeAssignment = useRemoveComponentAssignment();

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this component assignment?')) {
      await removeAssignment.mutateAsync({ employeeId, assignmentId });
    }
  };

  const getBenefitIcon = (benefitType?: string) => {
    switch (benefitType) {
      case 'car':
        return <Car className="w-5 h-5 text-blue-600" />;
      case 'housing':
        return <Home className="w-5 h-5 text-green-600" />;
      case 'phone':
        return <Smartphone className="w-5 h-5 text-purple-600" />;
      case 'internet':
        return <Wifi className="w-5 h-5 text-orange-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const renderAssignments = () => {
    if (isLoadingAssignments) {
      return (
        <div className="text-center py-8 text-gray-500">
          Loading component assignments...
        </div>
      );
    }

    if (assignmentsError) {
      return (
        <div className="p-4 bg-red-50 text-red-800 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load component assignments</span>
        </div>
      );
    }

    if (!assignments || assignments.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No component assignments yet
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {assignments.map((assignment: any) => {
          const config = assignment.configuration || {};
          const forfaitair = config.forfaitairBenefit;
          const carDetails = forfaitair?.carDetails;
          const housingDetails = forfaitair?.housingDetails;

          return (
            <div
              key={assignment.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {forfaitair && getBenefitIcon(forfaitair.benefitType)}
                    <h4 className="font-medium text-gray-900">
                      {assignment.componentName || assignment.componentCode}
                    </h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        assignment.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {assignment.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Forfaitair Benefit Details */}
                  {forfaitair && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        Forfaitair Benefit - {forfaitair.benefitType}
                      </div>
                      <div className="space-y-1 text-sm text-blue-800">
                        <div>Taxable Value: €{forfaitair.taxableValue}</div>
                        <div>Calculation: {forfaitair.calculationMethod}</div>

                        {/* Car details */}
                        {carDetails && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="font-medium">Car Details:</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                              {carDetails.make && (
                                <div>
                                  Make: {carDetails.make} {carDetails.model}
                                </div>
                              )}
                              {carDetails.licensePlate && (
                                <div>License: {carDetails.licensePlate}</div>
                              )}
                              {carDetails.catalogValue && (
                                <div>Catalog: €{carDetails.catalogValue}</div>
                              )}
                              {carDetails.co2Emission && (
                                <div>CO2: {carDetails.co2Emission} g/km</div>
                              )}
                              {carDetails.fuelType && <div>Fuel: {carDetails.fuelType}</div>}
                            </div>
                          </div>
                        )}

                        {/* Housing details */}
                        {housingDetails && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="font-medium">Housing Details:</div>
                            <div className="space-y-1 mt-1">
                              {housingDetails.address && <div>Address: {housingDetails.address}</div>}
                              {housingDetails.marketRent && (
                                <div>Market Rent: €{housingDetails.marketRent}/month</div>
                              )}
                              {housingDetails.actualRent && (
                                <div>Actual Rent: €{housingDetails.actualRent}/month</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* General assignment info */}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {assignment.overrideAmount && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>Override: €{assignment.overrideAmount}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        From {new Date(assignment.effectiveFrom).toLocaleDateString()}
                        {assignment.effectiveTo &&
                          ` to ${new Date(assignment.effectiveTo).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>

                  {assignment.notes && (
                    <p className="mt-2 text-sm text-gray-600">{assignment.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove"
                    disabled={removeAssignment.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pay Components for {employeeName || 'Employee'}
          </h3>
          {assignments && assignments.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Component</span>
        </button>
      </div>

      {/* Content */}
      <div>{renderAssignments()}</div>

      {/* Assign Component Modal */}
      <AssignEmployeeComponentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        employeeId={employeeId}
        employeeName={employeeName || 'Employee'}
      />
    </div>
  );
}

