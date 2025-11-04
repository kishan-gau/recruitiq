/**
 * Test Fixtures
 * Reusable test data for consistent testing
 */

export const TEST_JOB_DATA = {
  valid: {
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'San Francisco',
    employmentType: 'full-time',
    experienceLevel: 'senior',
    openings: '2',
    description: `We're looking for an experienced Software Engineer to join our team.

## Responsibilities
• Design and develop scalable applications
• Collaborate with cross-functional teams
• Mentor junior developers

## What We Offer
• Competitive salary and equity
• Remote work flexibility
• Professional development budget`,
    requirements: `## Required Qualifications
• 5+ years of software development experience
• Strong knowledge of React and Node.js
• Experience with cloud platforms (AWS/GCP)
• Excellent communication skills

## Nice to Have
• Experience with microservices architecture
• Knowledge of DevOps practices`,
    benefits: `• Health, dental, and vision insurance
• 401(k) matching
• Unlimited PTO
• Home office stipend`,
    salaryMin: '150000',
    salaryMax: '200000',
    salaryCurrency: 'USD',
    isRemote: true
  },
  
  minimal: {
    title: 'Test Job Posting',
    department: 'Engineering',
    location: 'Remote',
    employmentType: 'full-time',
    description: 'This is a minimal test job description with at least 10 characters.',
    requirements: 'Basic requirements for the test job.'
  },
  
  invalid: {
    title: '', // Required field empty
    department: 'Engineering',
    location: 'San Francisco',
    description: 'Short', // Too short
    requirements: ''
  },
  
  specialCharacters: {
    title: 'Senior Engineer (C++/Rust) - Backend <Team>',
    department: 'Engineering & Research',
    location: 'San Francisco, CA (Remote)',
    description: 'Job with **bold** and *italic* markdown formatting',
    requirements: '• Bullet points\n• Special chars: @#$%\n• Unicode: 你好'
  },
  
  longText: {
    title: 'A'.repeat(255),
    description: 'Long description. '.repeat(500),
    requirements: 'Long requirements. '.repeat(500)
  }
};

export const TEST_FLOW_DATA = {
  standard: {
    name: 'Standard Interview Process',
    stages: [
      { name: 'Application Review', color: '#3B82F6' },
      { name: 'Phone Screen', color: '#8B5CF6' },
      { name: 'Technical Interview', color: '#EC4899' },
      { name: 'Final Interview', color: '#F59E0B' },
      { name: 'Offer', color: '#10B981' }
    ]
  },
  
  minimal: {
    name: 'Quick Process',
    stages: [
      { name: 'Screen', color: '#3B82F6' },
      { name: 'Hire', color: '#10B981' }
    ]
  },
  
  maximum: {
    name: 'Comprehensive Process',
    stages: Array.from({ length: 10 }, (_, i) => ({
      name: `Stage ${i + 1}`,
      color: '#3B82F6'
    }))
  },
  
  invalid: {
    name: '', // Required field empty
    stages: [
      { name: 'Only One Stage', color: '#3B82F6' } // Need at least 2
    ]
  },
  
  duplicateStages: {
    name: 'Duplicate Test',
    stages: [
      { name: 'Interview', color: '#3B82F6' },
      { name: 'Interview', color: '#8B5CF6' } // Duplicate name
    ]
  }
};

export const TEST_CANDIDATE_DATA = {
  valid: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
    resume: 'path/to/resume.pdf',
    linkedIn: 'https://linkedin.com/in/johndoe',
    currentTitle: 'Senior Software Engineer',
    currentCompany: 'Tech Corp',
    yearsOfExperience: 8
  },
  
  minimal: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com'
  }
};

export const TEST_WORKSPACE_DATA = {
  default: {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Main Workspace',
    organizationId: '123e4567-e89b-12d3-a456-426614174001'
  },
  
  secondary: {
    id: '223e4567-e89b-12d3-a456-426614174002',
    name: 'Secondary Workspace',
    organizationId: '123e4567-e89b-12d3-a456-426614174001'
  }
};

/**
 * Generate UUID for testing
 */
export function generateTestUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Wait for a specific time (use sparingly, prefer conditional waits)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
