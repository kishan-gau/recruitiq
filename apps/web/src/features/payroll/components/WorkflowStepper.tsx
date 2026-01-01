/**
 * WorkflowStepper Component
 * 
 * Visual indicator showing the current status and progression of a payroll run
 * through the workflow stages: Draft → Calculating → Calculated → Approved → Processing → Processed
 */

import { Check, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { PayrollRunStatus } from '@recruitiq/types';

interface WorkflowStep {
  status: PayrollRunStatus;
  label: string;
  description: string;
  icon: 'check' | 'clock' | 'checkCircle' | 'alert' | 'loader';
}

const PAYROLL_WORKFLOW_STEPS: WorkflowStep[] = [
  { 
    status: 'draft', 
    label: 'Concept', 
    description: 'Loonrun aangemaakt',
    icon: 'clock'
  },
  { 
    status: 'calculating', 
    label: 'Berekenen', 
    description: 'Salarissen berekenen',
    icon: 'loader'
  },
  { 
    status: 'calculated', 
    label: 'Berekend', 
    description: 'Klaar voor controle',
    icon: 'checkCircle'
  },
  { 
    status: 'approved', 
    label: 'Goedgekeurd', 
    description: 'Klaar voor verwerking',
    icon: 'checkCircle'
  },
  { 
    status: 'processing', 
    label: 'Verwerken', 
    description: 'Betalingen verwerken',
    icon: 'loader'
  },
  { 
    status: 'processed', 
    label: 'Verwerkt', 
    description: 'Voltooid',
    icon: 'check'
  },
];

interface WorkflowStepperProps {
  currentStatus: PayrollRunStatus;
  className?: string;
  showLabels?: boolean;
  showDescriptions?: boolean;
}

export function WorkflowStepper({ 
  currentStatus, 
  className = '',
  showLabels = true,
  showDescriptions = false
}: WorkflowStepperProps) {
  // Special handling for cancelled status
  if (currentStatus === 'cancelled') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm font-medium text-red-900">Geannuleerd</span>
        </div>
      </div>
    );
  }

  const currentStepIndex = PAYROLL_WORKFLOW_STEPS.findIndex(step => step.status === currentStatus);

  const getStepColor = (stepIndex: number): string => {
    if (stepIndex < currentStepIndex) return 'text-green-600 bg-green-50 border-green-300';
    if (stepIndex === currentStepIndex) return 'text-blue-600 bg-blue-50 border-blue-300';
    return 'text-gray-400 bg-gray-50 border-gray-200';
  };

  const getConnectorColor = (stepIndex: number): string => {
    if (stepIndex < currentStepIndex) return 'bg-green-500';
    return 'bg-gray-300';
  };

  const renderIcon = (step: WorkflowStep, stepIndex: number) => {
    const isCompleted = stepIndex < currentStepIndex;
    const isCurrent = stepIndex === currentStepIndex;
    
    if (isCompleted) {
      return <Check className="w-4 h-4" />;
    }
    
    if (isCurrent) {
      switch (step.icon) {
        case 'loader':
          return <Loader2 className="w-4 h-4 animate-spin" />;
        case 'checkCircle':
          return <CheckCircle2 className="w-4 h-4" />;
        case 'alert':
          return <AlertCircle className="w-4 h-4" />;
        case 'clock':
          return <Clock className="w-4 h-4" />;
        default:
          return <Clock className="w-4 h-4" />;
      }
    }
    
    return <Clock className="w-4 h-4 opacity-50" />;
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-start justify-between">
        {PAYROLL_WORKFLOW_STEPS.map((step, index) => (
          <div key={step.status} className="flex flex-col items-center flex-1 relative">
            {/* Step circle */}
            <div className="flex flex-col items-center z-10">
              <div 
                className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center
                  transition-all duration-200 ${getStepColor(index)}
                `}
              >
                {renderIcon(step, index)}
              </div>
              
              {showLabels && (
                <div className="mt-2 text-center">
                  <div 
                    className={`
                      text-xs font-medium transition-colors
                      ${index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'}
                    `}
                  >
                    {step.label}
                  </div>
                  {showDescriptions && (
                    <div className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Connector line */}
            {index < PAYROLL_WORKFLOW_STEPS.length - 1 && (
              <div 
                className={`
                  absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2
                  transition-colors duration-200 ${getConnectorColor(index)}
                `}
                style={{ zIndex: 0 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function WorkflowStepperCompact({ currentStatus }: { currentStatus: PayrollRunStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 border border-red-200">
        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
        <span className="text-xs font-medium text-red-900">Geannuleerd</span>
      </div>
    );
  }

  const currentStepIndex = PAYROLL_WORKFLOW_STEPS.findIndex(step => step.status === currentStatus);
  const currentStep = PAYROLL_WORKFLOW_STEPS[currentStepIndex];
  const nextStep = PAYROLL_WORKFLOW_STEPS[currentStepIndex + 1];

  if (!currentStep) return null;

  return (
    <div className="inline-flex items-center gap-2 text-xs text-gray-600">
      <span className="font-medium text-gray-900">{currentStep.label}</span>
      {nextStep && (
        <>
          <span>→</span>
          <span className="text-gray-500">{nextStep.label}</span>
        </>
      )}
    </div>
  );
}
