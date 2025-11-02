import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Card from '../../components/licenses/Card';
import ProgressSteps from '../../components/licenses/ProgressSteps';
import CustomerInfoStep from '../../components/licenses/steps/CustomerInfoStep';
import DeploymentStep from '../../components/licenses/steps/DeploymentStep';
import TierStep from '../../components/licenses/steps/TierStep';
import LimitsStep from '../../components/licenses/steps/LimitsStep';
import SessionPolicyStep from '../../components/licenses/steps/SessionPolicyStep';
import ReviewStep from '../../components/licenses/steps/ReviewStep';
import apiService from '../../services/api';
import { FORM_STEPS, INITIAL_FORM_DATA } from '../../constants/licenseConstants';
import { validateStep, hasErrors } from '../../utils/validation';

export default function LicenseCreate() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    // Validate current step
    const stepErrors = validateStep(currentStep, formData);
    setErrors(stepErrors);

    if (hasErrors(stepErrors)) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    if (currentStep < FORM_STEPS.length) {
      setCurrentStep(currentStep + 1);
      setErrors({}); // Clear errors when moving to next step
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({}); // Clear errors when going back
    }
  };

  const handleSubmit = async () => {
    // Final validation
    const stepErrors = validateStep(currentStep, formData);
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors);
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating customer...');
    
    try {
      const customer = await apiService.createCustomer({
        name: formData.name,
        contactEmail: formData.contactEmail,
        contactName: formData.contactName,
        deploymentType: formData.deploymentType,
        instanceUrl: formData.instanceUrl,
        tier: formData.tier,
        maxUsers: formData.maxUsers,
        maxWorkspaces: formData.maxWorkspaces,
        maxJobs: formData.maxJobs,
        maxCandidates: formData.maxCandidates,
        features: formData.features,
        contractMonths: formData.durationMonths,
        sessionPolicy: formData.sessionPolicy,
        maxSessionsPerUser: formData.maxSessionsPerUser,
        concurrentLoginDetection: formData.concurrentLoginDetection,
        mfaRequired: formData.mfaRequired || formData.deploymentType === 'cloud-shared'
      });
      
      toast.success('Customer created successfully!', { id: loadingToast });
      navigate(`/licenses/customers/${customer.id}`);
    } catch (error) {
      console.error('Failed to create customer:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create customer';
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepProps = {
      formData,
      onChange: setFormData,
      errors
    };

    switch (currentStep) {
      case 1:
        return <CustomerInfoStep {...stepProps} />;
      case 2:
        return <DeploymentStep {...stepProps} />;
      case 3:
        return <TierStep {...stepProps} />;
      case 4:
        return <LimitsStep {...stepProps} />;
      case 5:
        return <SessionPolicyStep {...stepProps} />;
      case 6:
        return <ReviewStep formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/licenses/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back to customer list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New License</h1>
          <p className="text-gray-600 mt-1">Set up a new customer with license</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <ProgressSteps steps={FORM_STEPS} currentStep={currentStep} />
      </Card>

      {/* Step Content */}
      <Card>
        {renderStep()}
      </Card>

      {/* Navigation Buttons */}
      <Card>
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Go to previous step"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          {currentStep < FORM_STEPS.length ? (
            <button
              onClick={handleNext}
              className="btn btn-primary flex items-center"
              aria-label="Go to next step"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn btn-success flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Create license"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create License
                </>
              )}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
