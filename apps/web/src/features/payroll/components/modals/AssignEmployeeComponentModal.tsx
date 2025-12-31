/**
 * Modal for assigning pay components to employees
 * Formula-based component assignment system with forfaitair benefits
 */

import { X, Info } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { ForfaitairBenefitConfig } from '@recruitiq/types';

import {
  useAssignComponent,
} from '@/hooks';
import { usePayComponents } from '@/hooks';


interface AssignEmployeeComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

type BenefitType = 'car' | 'housing' | 'phone' | 'internet' | 'other';
type CalculationMethod = 'fixed' | 'percentage' | 'market_value';

export default function AssignEmployeeComponentModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: AssignEmployeeComponentModalProps) {
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [formData, setFormData] = useState({
    // Common fields
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    notes: '',

    // Assignment fields
    componentCode: '',
    overrideAmount: '',
    overrideFormula: '',

    // Forfaitair benefit configuration
    benefitType: 'car' as BenefitType,
    calculationMethod: 'fixed' as CalculationMethod,
    taxableValue: '',
    
    // Car details
    carMake: '',
    carModel: '',
    licensePlate: '',
    catalogValue: '',
    co2Emission: '',
    fuelType: 'petrol' as 'petrol' | 'diesel' | 'electric' | 'hybrid',
    
    // Housing details
    address: '',
    marketRent: '',
    actualRent: '',
  });

  const { data: componentsData } = usePayComponents();
  const assignComponent = useAssignComponent(employeeId);

  // Handle both array and object responses from API
  const components = Array.isArray(componentsData) 
    ? componentsData 
    : (componentsData as any)?.payComponents || [];

  const selectedComponent = components.find((c: any) => c.id === selectedComponentId);
  const isBenefitComponent = selectedComponent?.componentType === 'benefit';

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedComponentId('');
      setFormData({
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        notes: '',
        componentCode: '',
        overrideAmount: '',
        overrideFormula: '',
        benefitType: 'car',
        calculationMethod: 'fixed',
        taxableValue: '',
        carMake: '',
        carModel: '',
        licensePlate: '',
        catalogValue: '',
        co2Emission: '',
        fuelType: 'petrol',
        address: '',
        marketRent: '',
        actualRent: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedComponentId) {
      return;
    }

    try {
      // Component assignment with rich configuration
      const configuration: any = {};

      // Build configuration based on component type
      if (isBenefitComponent) {
          const forfaitairConfig: ForfaitairBenefitConfig = {
            benefitType: formData.benefitType,
            taxableValue: parseFloat(formData.taxableValue),
            calculationMethod: formData.calculationMethod,
          };

          if (formData.benefitType === 'car' && formData.carMake) {
            forfaitairConfig.carDetails = {
              make: formData.carMake,
              model: formData.carModel,
              licensePlate: formData.licensePlate,
              catalogValue: formData.catalogValue ? parseFloat(formData.catalogValue) : undefined,
              co2Emission: formData.co2Emission ? parseFloat(formData.co2Emission) : undefined,
              fuelType: formData.fuelType,
            };
          }

          if (formData.benefitType === 'housing' && formData.address) {
            forfaitairConfig.housingDetails = {
              address: formData.address,
              marketRent: formData.marketRent ? parseFloat(formData.marketRent) : undefined,
              actualRent: formData.actualRent ? parseFloat(formData.actualRent) : undefined,
            };
          }

          configuration.forfaitairBenefit = forfaitairConfig;
        }

        await assignComponent.mutateAsync({
          componentId: selectedComponentId,
          componentCode: formData.componentCode || selectedComponent?.componentCode || '',
          effectiveFrom: formData.effectiveFrom,
          effectiveTo: formData.effectiveTo || undefined,
          configuration,
          overrideAmount: formData.overrideAmount
            ? parseFloat(formData.overrideAmount)
            : undefined,
          overrideFormula: formData.overrideFormula || undefined,
          notes: formData.notes || undefined,
        });

      onClose();
    } catch (error) {
      console.error('Failed to assign component:', error);
    }
  };

  const isSubmitting = assignComponent.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assign Component</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Assign pay component to {employeeName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Component Selection */}
              <div className="mb-4">
                <label htmlFor="component" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pay Component *
                </label>
                <select
                  id="component"
                  value={selectedComponentId}
                  onChange={(e) => setSelectedComponentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a component...</option>
                  {components.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.componentName} ({c.componentCode}) - {c.componentType}
                    </option>
                  ))}
                </select>
              </div>

              {selectedComponent && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div className="font-medium">{selectedComponent.componentName}</div>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">{selectedComponent.description}</div>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span>Type: {selectedComponent.componentType}</span>
                      <span>Calculation: {selectedComponent.calculationType}</span>
                      {selectedComponent.defaultRate && (
                        <span>Rate: {selectedComponent.defaultRate}</span>
                      )}
                      {selectedComponent.defaultAmount && (
                        <span>Amount: {selectedComponent.defaultAmount}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Forfaitair Benefit Configuration */}
              {selectedComponentId && isBenefitComponent && (
                <div className="space-y-4">
                  {/* Benefit Type */}
                  <div>
                    <label htmlFor="benefitType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Benefit Type *
                    </label>
                    <select
                      id="benefitType"
                      value={formData.benefitType}
                      onChange={(e) =>
                        setFormData({ ...formData, benefitType: e.target.value as BenefitType })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="car">Car Benefit (Auto van de zaak)</option>
                      <option value="housing">Housing Benefit</option>
                      <option value="phone">Phone Benefit</option>
                      <option value="internet">Internet Benefit</option>
                      <option value="other">Other Benefit</option>
                    </select>
                  </div>

                  {/* Calculation Method */}
                  <div>
                    <label htmlFor="calculationMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Calculation Method *
                    </label>
                    <select
                      id="calculationMethod"
                      value={formData.calculationMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          calculationMethod: e.target.value as CalculationMethod,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage of Value</option>
                      <option value="market_value">Market Value Based</option>
                    </select>
                  </div>

                  {/* Taxable Value */}
                  <div>
                    <label htmlFor="taxableValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Taxable Value (EUR) *
                    </label>
                    <input
                      type="number"
                      id="taxableValue"
                      step="0.01"
                      value={formData.taxableValue}
                      onChange={(e) => setFormData({ ...formData, taxableValue: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 500.00"
                      required
                    />
                  </div>

                  {/* Car-specific fields */}
                  {formData.benefitType === 'car' && (
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <h4 className="font-medium text-gray-900">Car Details</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="carMake" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Make
                          </label>
                          <input
                            type="text"
                            id="carMake"
                            value={formData.carMake}
                            onChange={(e) => setFormData({ ...formData, carMake: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Toyota"
                          />
                        </div>
                        <div>
                          <label htmlFor="carModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Model
                          </label>
                          <input
                            type="text"
                            id="carModel"
                            value={formData.carModel}
                            onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Camry"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            License Plate
                          </label>
                          <input
                            type="text"
                            id="licensePlate"
                            value={formData.licensePlate}
                            onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., AB-123-CD"
                          />
                        </div>
                        <div>
                          <label htmlFor="catalogValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Catalog Value (EUR)
                          </label>
                          <input
                            type="number"
                            id="catalogValue"
                            step="0.01"
                            value={formData.catalogValue}
                            onChange={(e) => setFormData({ ...formData, catalogValue: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 35000.00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fuel Type
                          </label>
                          <select
                            id="fuelType"
                            value={formData.fuelType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                fuelType: e.target.value as 'petrol' | 'diesel' | 'electric' | 'hybrid',
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="petrol">Petrol</option>
                            <option value="diesel">Diesel</option>
                            <option value="electric">Electric</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="co2Emission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            CO2 Emission (g/km)
                          </label>
                          <input
                            type="number"
                            id="co2Emission"
                            value={formData.co2Emission}
                            onChange={(e) => setFormData({ ...formData, co2Emission: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 120"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Housing-specific fields */}
                  {formData.benefitType === 'housing' && (
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <h4 className="font-medium text-gray-900">Housing Details</h4>
                      
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Full address"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="marketRent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Market Rent (EUR/month)
                          </label>
                          <input
                            type="number"
                            id="marketRent"
                            step="0.01"
                            value={formData.marketRent}
                            onChange={(e) => setFormData({ ...formData, marketRent: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 1500.00"
                          />
                        </div>
                        <div>
                          <label htmlFor="actualRent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Actual Rent (EUR/month)
                          </label>
                          <input
                            type="number"
                            id="actualRent"
                            step="0.01"
                            value={formData.actualRent}
                            onChange={(e) => setFormData({ ...formData, actualRent: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 800.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Common fields */}
              {selectedComponentId && (
                <>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label htmlFor="effectiveFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Effective From *
                      </label>
                      <input
                        type="date"
                        id="effectiveFrom"
                        value={formData.effectiveFrom}
                        onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="effectiveTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Effective To
                      </label>
                      <input
                        type="date"
                        id="effectiveTo"
                        value={formData.effectiveTo}
                        onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes or comments..."
                    />
                  </div>
                </>
              )}

              {/* Info box */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p>
                    Component assignments support full configuration including forfaitair benefits
                    (company car, housing), which are common in Dutch payroll. All details will be
                    used for accurate tax calculations.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                disabled={isSubmitting || !selectedComponentId}
              >
                {isSubmitting ? 'Assigning...' : 'Assign Component'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
