/**
 * Progress Steps Component
 */
import { Check } from 'lucide-react';

export default function ProgressSteps({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                currentStep >= step.number
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
              aria-current={currentStep === step.number ? 'step' : undefined}
            >
              {currentStep > step.number ? (
                <Check className="w-5 h-5" aria-label="Completed" />
              ) : (
                step.number
              )}
            </div>
            <span className="text-xs text-gray-600 mt-2 text-center">{step.title}</span>
          </div>
          {index < steps.length - 1 && (
            <div 
              className={`h-1 flex-1 mx-4 transition-colors ${
                currentStep > step.number ? 'bg-primary-600' : 'bg-gray-200'
              }`}
              role="presentation"
            ></div>
          )}
        </div>
      ))}
    </div>
  );
}
