/**
 * Form Validation Utilities
 */

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url) => {
  if (!url) return true; // URL is optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateCustomerInfo = (formData) => {
  const errors = {};
  
  if (!formData.name || formData.name.trim() === '') {
    errors.name = 'Organization name is required';
  }
  
  if (!formData.contactName || formData.contactName.trim() === '') {
    errors.contactName = 'Contact name is required';
  }
  
  if (!formData.contactEmail || formData.contactEmail.trim() === '') {
    errors.contactEmail = 'Contact email is required';
  } else if (!isValidEmail(formData.contactEmail)) {
    errors.contactEmail = 'Please enter a valid email address';
  }
  
  return errors;
};

export const validateDeployment = (formData) => {
  const errors = {};
  
  if (!formData.deploymentType) {
    errors.deploymentType = 'Please select a deployment type';
  }
  
  if (formData.instanceUrl && !isValidUrl(formData.instanceUrl)) {
    errors.instanceUrl = 'Please enter a valid URL';
  }
  
  return errors;
};

export const validateLimits = (formData) => {
  const errors = {};
  
  if (formData.maxUsers !== null && formData.maxUsers < 1) {
    errors.maxUsers = 'Must be at least 1 or leave empty for unlimited';
  }
  
  if (formData.maxWorkspaces !== null && formData.maxWorkspaces < 1) {
    errors.maxWorkspaces = 'Must be at least 1 or leave empty for unlimited';
  }
  
  if (formData.maxJobs !== null && formData.maxJobs < 1) {
    errors.maxJobs = 'Must be at least 1 or leave empty for unlimited';
  }
  
  if (formData.maxCandidates !== null && formData.maxCandidates < 1) {
    errors.maxCandidates = 'Must be at least 1 or leave empty for unlimited';
  }
  
  if (!formData.durationMonths || formData.durationMonths < 1) {
    errors.durationMonths = 'Please select a license duration';
  }
  
  return errors;
};

export const validateStep = (step, formData) => {
  switch (step) {
    case 1:
      return validateCustomerInfo(formData);
    case 2:
      return validateDeployment(formData);
    case 3:
      return {}; // Tier selection has no validation needed
    case 4:
      return validateLimits(formData);
    case 5:
      return {}; // Review step has no validation
    default:
      return {};
  }
};

export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};
