// Import styles
import './styles.css';

// ============================================
// GENERIC UI COMPONENTS - Used Across All Features
// ============================================

// Core UI Components
export * from './components/Button';
export * from './components/Card';
export * from './components/Input';
export * from './components/Modal';
export * from './components/LoadingSpinner';
export * from './components/StatusBadge';
export * from './components/StatisticsCard';

// Form Components
export * from './components/Switch';
export * from './components/Select';
export * from './components/Tabs';

// Feature Management Components
export * from './components/FeatureGate';
export * from './components/UpgradePrompt';
export * from './components/FeatureUsageIndicator';

// ============================================
// RBAC COMPONENTS - Permission-Based Access Control
// ============================================
export * from './rbac';

// ============================================
// HOOKS - Reusable Logic
// ============================================
export * from './hooks';

// ============================================
// FEATURE-SPECIFIC COMPONENTS (DO NOT IMPORT HERE)
// ============================================
// Recruitment-specific components: apps/web/src/features/recruitment/components/shared/
// HRIS-specific components: apps/web/src/features/hris/components/shared/ (if created)
// Payroll-specific components: apps/web/src/features/payroll/components/shared/ (if created)
// ScheduleHub-specific components: apps/web/src/features/scheduling/components/shared/ (if created)
