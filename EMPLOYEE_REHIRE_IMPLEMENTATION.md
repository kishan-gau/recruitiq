# Employee Lifecycle Management Architecture

## Overview
Comprehensive employee lifecycle management system for Nexus HRIS, tracking the complete employee journey from recruitment through termination and potential rehire. This architecture covers employment history, career progression, compensation changes, performance management, training, and offboarding processes.

## System Architecture Principles

### Design Goals
1. **Complete Journey Tracking** - Capture every significant event in an employee's career
2. **Historical Integrity** - Preserve all historical data with denormalized snapshots
3. **Audit Compliance** - Full audit trail for compliance and reporting
4. **Flexible Workflows** - Support various organizational policies and approval processes
5. **Performance Optimization** - Efficient queries with proper indexing and constraints
6. **Multi-tenant Security** - Organization-scoped data with row-level security

### Data Organization
- **Core Employee Data** - Personal information, current status
- **Historical Tables** - Immutable records of all changes (employment, position, compensation)
- **Transactional Data** - Performance reviews, training, time off
- **Reference Data** - Departments, locations, job titles, policies

## Database Schema

### Phase 1: Employment History & Rehire (Implemented)

#### Table: `hris.employment_history`
Tracks complete employment history for each employee, supporting multiple employment periods (rehires).

**Key Features:**
- **Period Tracking**: `start_date`, `end_date`, `is_current` flag
- **Rehire Support**: `is_rehire`, `rehire_notes`, `is_rehire_eligible`
- **Historical Snapshots**: Department/manager names denormalized to preserve context
- **Termination Details**: 8 termination reasons, notes, eligibility flag
- **Safety Constraints**:
  - Only ONE current period per employee (unique constraint)
  - No overlapping periods (EXCLUDE using GIST with daterange)

**Termination Reasons:**
1. `resignation`
2. `layoff`
3. `termination_with_cause`
4. `termination_without_cause`
5. `mutual_agreement`
6. `retirement`
7. `contract_expiry`
8. `other`

---

### Phase 2: Career Progression & Position History (New)

#### Table: `hris.position_history`
Tracks every position change, promotion, demotion, transfer, or role modification during employment.

**Purpose:** Capture complete career progression within each employment period.

**Schema:**
```sql
CREATE TABLE hris.position_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    employment_history_id UUID NOT NULL REFERENCES hris.employment_history(id) ON DELETE CASCADE,
    
    -- Change Type
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
        'initial_hire',
        'promotion',
        'demotion',
        'lateral_transfer',
        'department_change',
        'location_change',
        'title_change',
        'manager_change',
        'role_modification'
    )),
    
    -- Effective Date
    effective_date DATE NOT NULL,
    
    -- Position Details (snapshot)
    job_title VARCHAR(255) NOT NULL,
    job_level VARCHAR(50),
    job_family VARCHAR(100),
    department_id UUID REFERENCES hris.department(id) ON DELETE SET NULL,
    department_name VARCHAR(255), -- Denormalized
    location_id UUID REFERENCES hris.location(id) ON DELETE SET NULL,
    location_name VARCHAR(255), -- Denormalized
    manager_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    manager_name VARCHAR(255), -- Denormalized
    
    -- Employment Details
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')),
    fte_percentage DECIMAL(5,2) DEFAULT 100.00,
    work_schedule VARCHAR(50),
    
    -- Change Context
    reason TEXT,
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_position_history_org ON hris.position_history(organization_id);
CREATE INDEX idx_position_history_employee ON hris.position_history(employee_id);
CREATE INDEX idx_position_history_employment ON hris.position_history(employment_history_id);
CREATE INDEX idx_position_history_effective_date ON hris.position_history(effective_date);
CREATE INDEX idx_position_history_change_type ON hris.position_history(change_type);

COMMENT ON TABLE hris.position_history IS 'Complete position change history tracking all career movements within each employment period. Links to employment_history to associate with specific employment stints.';
COMMENT ON COLUMN hris.position_history.change_type IS 'Type of position change: promotion, transfer, role change, etc.';
COMMENT ON COLUMN hris.position_history.job_level IS 'Career level or grade (e.g., L1, L2, Senior, Manager)';
COMMENT ON COLUMN hris.position_history.job_family IS 'Job family/category (e.g., Engineering, Sales, Operations)';
```

**Key Features:**
- Links to `employment_history` to associate position changes with employment periods
- Tracks all types of career movements (promotions, transfers, role changes)
- Denormalizes department/location/manager names for historical integrity
- Optional approval workflow for position changes
- Supports job levels and job families for career progression tracking

---

#### Table: `hris.promotion`
Dedicated promotion tracking with justification and career advancement details.

**Schema:**
```sql
CREATE TABLE hris.promotion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    position_history_id UUID NOT NULL REFERENCES hris.position_history(id) ON DELETE CASCADE,
    
    -- Promotion Details
    promotion_type VARCHAR(50) CHECK (promotion_type IN (
        'vertical', -- Move up in hierarchy
        'lateral_with_growth', -- Same level but increased scope
        'acting_role', -- Temporary promotion
        'permanent'
    )),
    
    -- From/To Comparison
    from_job_title VARCHAR(255) NOT NULL,
    to_job_title VARCHAR(255) NOT NULL,
    from_job_level VARCHAR(50),
    to_job_level VARCHAR(50),
    from_department_name VARCHAR(255),
    to_department_name VARCHAR(255),
    
    -- Justification
    justification TEXT NOT NULL,
    performance_review_id UUID REFERENCES hris.performance_review(id) ON DELETE SET NULL,
    business_impact TEXT,
    skills_acquired JSONB DEFAULT '[]',
    
    -- Approval Workflow
    nominated_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    nomination_date DATE,
    approved_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    approval_date DATE,
    approval_notes TEXT,
    
    -- Compensation Impact (reference to compensation_adjustment)
    compensation_adjustment_id UUID,
    salary_increase_percentage DECIMAL(5,2),
    
    -- Effective Date
    effective_date DATE NOT NULL,
    announcement_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_promotion_org ON hris.promotion(organization_id);
CREATE INDEX idx_promotion_employee ON hris.promotion(employee_id);
CREATE INDEX idx_promotion_effective_date ON hris.promotion(effective_date);
CREATE INDEX idx_promotion_type ON hris.promotion(promotion_type);

COMMENT ON TABLE hris.promotion IS 'Dedicated promotion tracking with justification, approval workflow, and career advancement context. Links to position_history for complete change details.';
```

---

### Phase 3: Compensation Management (New)

#### Table: `hris.compensation_adjustment`
Tracks all salary, bonus, and compensation changes outside of contracts.

**Schema:**
```sql
CREATE TABLE hris.compensation_adjustment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    
    -- Adjustment Type
    adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN (
        'annual_increase',
        'merit_increase',
        'promotion_adjustment',
        'market_adjustment',
        'cost_of_living',
        'retention_adjustment',
        'equity_adjustment',
        'demotion_reduction',
        'corrective_adjustment',
        'bonus',
        'one_time_payment'
    )),
    
    -- Compensation Details
    previous_salary DECIMAL(15,2),
    new_salary DECIMAL(15,2),
    adjustment_amount DECIMAL(15,2) NOT NULL,
    adjustment_percentage DECIMAL(5,2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Payment Frequency (for recurring adjustments)
    payment_frequency VARCHAR(50) CHECK (payment_frequency IN (
        'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'annually', 'one_time'
    )),
    
    -- Effective Date
    effective_date DATE NOT NULL,
    retroactive_to_date DATE,
    
    -- Context
    reason TEXT NOT NULL,
    performance_review_id UUID REFERENCES hris.performance_review(id) ON DELETE SET NULL,
    promotion_id UUID REFERENCES hris.promotion(id) ON DELETE SET NULL,
    position_history_id UUID REFERENCES hris.position_history(id) ON DELETE SET NULL,
    
    -- Approval Workflow
    requested_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'rejected', 'cancelled'
    )),
    
    -- Budget Impact
    budget_code VARCHAR(50),
    budget_impact DECIMAL(15,2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_compensation_adjustment_org ON hris.compensation_adjustment(organization_id);
CREATE INDEX idx_compensation_adjustment_employee ON hris.compensation_adjustment(employee_id);
CREATE INDEX idx_compensation_adjustment_effective_date ON hris.compensation_adjustment(effective_date);
CREATE INDEX idx_compensation_adjustment_type ON hris.compensation_adjustment(adjustment_type);
CREATE INDEX idx_compensation_adjustment_status ON hris.compensation_adjustment(approval_status);

COMMENT ON TABLE hris.compensation_adjustment IS 'Complete compensation change history including raises, bonuses, adjustments. Links to promotions and performance reviews for context.';
```

---

### Phase 4: Training & Development (New)

#### Table: `hris.training_program`
Defines available training programs, courses, and certifications.

**Schema:**
```sql
CREATE TABLE hris.training_program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Program Information
    program_code VARCHAR(50) NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    program_type VARCHAR(50) CHECK (program_type IN (
        'onboarding',
        'technical_skills',
        'soft_skills',
        'leadership',
        'compliance',
        'certification',
        'professional_development'
    )),
    
    -- Provider
    provider_name VARCHAR(255),
    provider_type VARCHAR(50) CHECK (provider_type IN ('internal', 'external', 'online', 'hybrid')),
    
    -- Duration & Format
    duration_hours DECIMAL(6,2),
    delivery_method VARCHAR(50) CHECK (delivery_method IN (
        'in_person', 'virtual', 'self_paced', 'blended'
    )),
    
    -- Requirements
    prerequisites JSONB DEFAULT '[]',
    target_roles JSONB DEFAULT '[]',
    is_mandatory BOOLEAN DEFAULT false,
    
    -- Certification
    provides_certification BOOLEAN DEFAULT false,
    certification_name VARCHAR(255),
    certification_validity_months INTEGER,
    
    -- Cost
    cost_per_participant DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_program_code UNIQUE (organization_id, program_code)
);

CREATE INDEX idx_training_program_org ON hris.training_program(organization_id);
CREATE INDEX idx_training_program_type ON hris.training_program(program_type);
CREATE INDEX idx_training_program_active ON hris.training_program(is_active) WHERE deleted_at IS NULL;
```

---

#### Table: `hris.training_record`
Tracks employee training completion, certifications, and skills acquired.

**Schema:**
```sql
CREATE TABLE hris.training_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    training_program_id UUID REFERENCES hris.training_program(id) ON DELETE SET NULL,
    
    -- Training Details
    training_name VARCHAR(255) NOT NULL,
    training_type VARCHAR(50),
    provider_name VARCHAR(255),
    
    -- Dates
    enrollment_date DATE,
    start_date DATE,
    completion_date DATE,
    expiry_date DATE, -- For certifications that expire
    
    -- Status
    status VARCHAR(50) DEFAULT 'enrolled' CHECK (status IN (
        'enrolled',
        'in_progress',
        'completed',
        'failed',
        'cancelled',
        'expired'
    )),
    
    -- Results
    score DECIMAL(5,2),
    passing_score DECIMAL(5,2),
    grade VARCHAR(10),
    hours_completed DECIMAL(6,2),
    
    -- Certification
    certification_obtained BOOLEAN DEFAULT false,
    certification_number VARCHAR(100),
    certification_file_url VARCHAR(500),
    
    -- Skills Acquired
    skills_acquired JSONB DEFAULT '[]',
    competencies_improved JSONB DEFAULT '[]',
    
    -- Cost Tracking
    training_cost DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    paid_by VARCHAR(50) CHECK (paid_by IN ('employer', 'employee', 'shared', 'external')),
    
    -- Feedback
    employee_feedback TEXT,
    employee_rating INTEGER CHECK (employee_rating BETWEEN 1 AND 5),
    manager_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_training_record_org ON hris.training_record(organization_id);
CREATE INDEX idx_training_record_employee ON hris.training_record(employee_id);
CREATE INDEX idx_training_record_program ON hris.training_record(training_program_id);
CREATE INDEX idx_training_record_status ON hris.training_record(status);
CREATE INDEX idx_training_record_expiry ON hris.training_record(expiry_date) WHERE expiry_date IS NOT NULL;

COMMENT ON TABLE hris.training_record IS 'Complete training and certification history for employees. Tracks enrollment, completion, scores, and skills acquired.';
```

---

### Phase 5: Disciplinary Management (New)

#### Table: `hris.disciplinary_action`
Tracks warnings, performance improvement plans, and disciplinary measures.

**Schema:**
```sql
CREATE TABLE hris.disciplinary_action (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    
    -- Action Type
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'verbal_warning',
        'written_warning',
        'final_warning',
        'performance_improvement_plan',
        'suspension_with_pay',
        'suspension_without_pay',
        'demotion',
        'termination_notice',
        'other'
    )),
    
    -- Severity
    severity_level VARCHAR(50) CHECK (severity_level IN (
        'minor', 'moderate', 'serious', 'critical'
    )),
    
    -- Incident Details
    incident_date DATE NOT NULL,
    incident_description TEXT NOT NULL,
    violation_category VARCHAR(100) CHECK (violation_category IN (
        'attendance',
        'conduct',
        'performance',
        'policy_violation',
        'safety',
        'harassment',
        'insubordination',
        'other'
    )),
    
    -- Action Details
    action_date DATE NOT NULL,
    action_description TEXT NOT NULL,
    corrective_measures TEXT,
    expected_improvement TEXT,
    
    -- Timeline
    review_date DATE,
    expiry_date DATE, -- When the action expires (if applicable)
    
    -- PIP Specific (if action_type = 'performance_improvement_plan')
    pip_start_date DATE,
    pip_end_date DATE,
    pip_goals JSONB DEFAULT '[]',
    pip_status VARCHAR(50) CHECK (pip_status IN (
        'active', 'successful', 'unsuccessful', 'extended', 'cancelled'
    )),
    
    -- Witnesses & Evidence
    witnesses JSONB DEFAULT '[]',
    evidence_documents JSONB DEFAULT '[]',
    
    -- Employee Response
    employee_acknowledgement BOOLEAN DEFAULT false,
    employee_acknowledgement_date DATE,
    employee_statement TEXT,
    employee_signature_url VARCHAR(500),
    
    -- Approval & Review
    issued_by UUID NOT NULL REFERENCES hris.employee(id) ON DELETE RESTRICT,
    reviewed_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    hr_reviewed BOOLEAN DEFAULT false,
    hr_reviewer_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    hr_review_date DATE,
    
    -- Outcome
    outcome VARCHAR(50) CHECK (outcome IN (
        'pending',
        'resolved_satisfactory',
        'resolved_unsatisfactory',
        'escalated',
        'withdrawn',
        'appealed'
    )),
    outcome_date DATE,
    outcome_notes TEXT,
    
    -- Appeal
    appeal_filed BOOLEAN DEFAULT false,
    appeal_date DATE,
    appeal_reason TEXT,
    appeal_decision VARCHAR(50) CHECK (appeal_decision IN (
        'upheld', 'overturned', 'modified', 'pending'
    )),
    
    -- Impact
    impacts_promotion_eligibility BOOLEAN DEFAULT false,
    impacts_bonus_eligibility BOOLEAN DEFAULT false,
    
    -- Confidentiality
    is_confidential BOOLEAN DEFAULT true,
    access_restricted_to JSONB DEFAULT '[]', -- Array of user IDs
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_disciplinary_action_org ON hris.disciplinary_action(organization_id);
CREATE INDEX idx_disciplinary_action_employee ON hris.disciplinary_action(employee_id);
CREATE INDEX idx_disciplinary_action_type ON hris.disciplinary_action(action_type);
CREATE INDEX idx_disciplinary_action_date ON hris.disciplinary_action(action_date);
CREATE INDEX idx_disciplinary_action_severity ON hris.disciplinary_action(severity_level);
CREATE INDEX idx_disciplinary_action_outcome ON hris.disciplinary_action(outcome);

COMMENT ON TABLE hris.disciplinary_action IS 'Complete disciplinary and corrective action history including warnings, PIPs, suspensions. Supports appeal process and outcome tracking.';
```

---

### Phase 6: Internal Mobility (New)

#### Table: `hris.internal_transfer`
Tracks internal transfers between departments, locations, or business units.

**Schema:**
```sql
CREATE TABLE hris.internal_transfer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    position_history_id UUID REFERENCES hris.position_history(id) ON DELETE SET NULL,
    
    -- Transfer Type
    transfer_type VARCHAR(50) NOT NULL CHECK (transfer_type IN (
        'department_transfer',
        'location_transfer',
        'business_unit_transfer',
        'temporary_assignment',
        'secondment',
        'rotation',
        'project_assignment'
    )),
    
    -- From/To Details
    from_department_id UUID REFERENCES hris.department(id) ON DELETE SET NULL,
    from_department_name VARCHAR(255),
    to_department_id UUID REFERENCES hris.department(id) ON DELETE SET NULL,
    to_department_name VARCHAR(255),
    
    from_location_id UUID REFERENCES hris.location(id) ON DELETE SET NULL,
    from_location_name VARCHAR(255),
    to_location_id UUID REFERENCES hris.location(id) ON DELETE SET NULL,
    to_location_name VARCHAR(255),
    
    from_manager_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    from_manager_name VARCHAR(255),
    to_manager_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    to_manager_name VARCHAR(255),
    
    -- Timeline
    request_date DATE,
    effective_date DATE NOT NULL,
    end_date DATE, -- For temporary assignments/secondments
    is_permanent BOOLEAN DEFAULT true,
    
    -- Reason & Context
    transfer_reason VARCHAR(100) CHECK (transfer_reason IN (
        'employee_request',
        'business_need',
        'restructuring',
        'skill_development',
        'project_need',
        'career_development',
        'relocation',
        'performance_related',
        'other'
    )),
    reason_description TEXT,
    business_justification TEXT,
    
    -- Initiation
    initiated_by VARCHAR(50) CHECK (initiated_by IN ('employee', 'manager', 'hr', 'executive')),
    initiator_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    
    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT true,
    current_manager_approved BOOLEAN DEFAULT false,
    current_manager_approval_date DATE,
    new_manager_approved BOOLEAN DEFAULT false,
    new_manager_approval_date DATE,
    hr_approved BOOLEAN DEFAULT false,
    hr_approval_date DATE,
    
    overall_status VARCHAR(50) DEFAULT 'pending' CHECK (overall_status IN (
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'completed'
    )),
    
    -- Compensation Impact
    compensation_change BOOLEAN DEFAULT false,
    compensation_adjustment_id UUID REFERENCES hris.compensation_adjustment(id) ON DELETE SET NULL,
    
    -- Knowledge Transfer
    knowledge_transfer_required BOOLEAN DEFAULT false,
    knowledge_transfer_completed BOOLEAN DEFAULT false,
    knowledge_transfer_notes TEXT,
    
    -- Relocation Assistance
    relocation_assistance_provided BOOLEAN DEFAULT false,
    relocation_cost DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_internal_transfer_org ON hris.internal_transfer(organization_id);
CREATE INDEX idx_internal_transfer_employee ON hris.internal_transfer(employee_id);
CREATE INDEX idx_internal_transfer_effective_date ON hris.internal_transfer(effective_date);
CREATE INDEX idx_internal_transfer_status ON hris.internal_transfer(overall_status);
CREATE INDEX idx_internal_transfer_type ON hris.internal_transfer(transfer_type);

COMMENT ON TABLE hris.internal_transfer IS 'Internal mobility tracking including transfers, secondments, and temporary assignments with approval workflow.';
```

---

### Phase 7: Offboarding & Exit Management (New)

#### Table: `hris.offboarding_checklist_template`
Defines offboarding process templates for different employee types/scenarios.

**Schema:**
```sql
CREATE TABLE hris.offboarding_checklist_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Template Information
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Applicability
    applies_to_employment_types JSONB DEFAULT '[]', -- ['full_time', 'contract']
    applies_to_departments JSONB DEFAULT '[]',
    applies_to_job_levels JSONB DEFAULT '[]',
    
    -- Checklist Items
    checklist_items JSONB NOT NULL DEFAULT '[]', -- Array of task definitions
    
    -- Timing
    days_before_last_day INTEGER DEFAULT 14,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_offboarding_template_org ON hris.offboarding_checklist_template(organization_id);
CREATE INDEX idx_offboarding_template_active ON hris.offboarding_checklist_template(is_active);
```

---

#### Table: `hris.offboarding_process`
Tracks the complete offboarding process for each termination.

**Schema:**
```sql
CREATE TABLE hris.offboarding_process (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    employment_history_id UUID NOT NULL REFERENCES hris.employment_history(id) ON DELETE CASCADE,
    template_id UUID REFERENCES hris.offboarding_checklist_template(id) ON DELETE SET NULL,
    
    -- Process Status
    status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN (
        'initiated',
        'in_progress',
        'awaiting_clearance',
        'completed',
        'cancelled'
    )),
    
    -- Timeline
    initiated_date DATE NOT NULL,
    last_working_day DATE NOT NULL,
    offboarding_completion_date DATE,
    
    -- Coordinator
    hr_coordinator_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    
    -- Exit Interview
    exit_interview_scheduled BOOLEAN DEFAULT false,
    exit_interview_date DATE,
    exit_interview_conducted_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    exit_interview_notes TEXT,
    exit_interview_recording_url VARCHAR(500),
    
    -- Exit Survey
    exit_survey_sent BOOLEAN DEFAULT false,
    exit_survey_completed BOOLEAN DEFAULT false,
    exit_survey_response JSONB DEFAULT '{}',
    
    -- Checklist Progress
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Asset Return
    assets_returned BOOLEAN DEFAULT false,
    assets_return_date DATE,
    assets_outstanding TEXT,
    
    -- Access Revocation
    system_access_revoked BOOLEAN DEFAULT false,
    access_revocation_date DATE,
    building_access_revoked BOOLEAN DEFAULT false,
    
    -- Knowledge Transfer
    knowledge_transfer_completed BOOLEAN DEFAULT false,
    knowledge_transfer_recipient_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    handover_documentation_url VARCHAR(500),
    
    -- Final Clearance
    clearance_status VARCHAR(50) DEFAULT 'pending' CHECK (clearance_status IN (
        'pending',
        'cleared',
        'pending_with_issues',
        'not_cleared'
    )),
    clearance_issues TEXT,
    final_clearance_date DATE,
    final_clearance_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_offboarding_process_org ON hris.offboarding_process(organization_id);
CREATE INDEX idx_offboarding_process_employee ON hris.offboarding_process(employee_id);
CREATE INDEX idx_offboarding_process_status ON hris.offboarding_process(status);
CREATE INDEX idx_offboarding_process_last_working_day ON hris.offboarding_process(last_working_day);
```

---

#### Table: `hris.offboarding_task`
Individual tasks within an offboarding process.

**Schema:**
```sql
CREATE TABLE hris.offboarding_task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    offboarding_process_id UUID NOT NULL REFERENCES hris.offboarding_process(id) ON DELETE CASCADE,
    
    -- Task Details
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_category VARCHAR(100) CHECK (task_category IN (
        'documentation',
        'asset_return',
        'access_revocation',
        'knowledge_transfer',
        'exit_interview',
        'clearance',
        'payroll_finalization',
        'benefits_termination',
        'other'
    )),
    
    -- Assignment
    assigned_to VARCHAR(50) CHECK (assigned_to IN ('hr', 'manager', 'it', 'finance', 'employee', 'admin')),
    assigned_user_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    
    -- Priority & Timing
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    due_date DATE,
    must_complete_before_last_day BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'in_progress',
        'completed',
        'skipped',
        'blocked'
    )),
    
    -- Completion
    completed_date DATE,
    completed_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    completion_notes TEXT,
    
    -- Dependencies
    depends_on_task_ids JSONB DEFAULT '[]',
    blocks_task_ids JSONB DEFAULT '[]',
    
    -- Evidence
    evidence_required BOOLEAN DEFAULT false,
    evidence_documents JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_offboarding_task_org ON hris.offboarding_task(organization_id);
CREATE INDEX idx_offboarding_task_process ON hris.offboarding_task(offboarding_process_id);
CREATE INDEX idx_offboarding_task_status ON hris.offboarding_task(status);
CREATE INDEX idx_offboarding_task_due_date ON hris.offboarding_task(due_date);
```

---

#### Table: `hris.exit_interview`
Structured exit interview data capture.

**Schema:**
```sql
CREATE TABLE hris.exit_interview (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    offboarding_process_id UUID NOT NULL REFERENCES hris.offboarding_process(id) ON DELETE CASCADE,
    
    -- Interview Details
    interview_date DATE NOT NULL,
    conducted_by UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    interview_method VARCHAR(50) CHECK (interview_method IN ('in_person', 'video_call', 'phone', 'written_survey')),
    
    -- Departure Reasons
    primary_reason VARCHAR(100) CHECK (primary_reason IN (
        'better_opportunity',
        'compensation',
        'career_growth',
        'work_life_balance',
        'management_issues',
        'company_culture',
        'relocation',
        'personal_reasons',
        'retirement',
        'education',
        'health',
        'other'
    )),
    secondary_reasons JSONB DEFAULT '[]',
    detailed_explanation TEXT,
    
    -- Satisfaction Ratings (1-5 scale)
    overall_satisfaction INTEGER CHECK (overall_satisfaction BETWEEN 1 AND 5),
    job_satisfaction INTEGER CHECK (job_satisfaction BETWEEN 1 AND 5),
    manager_satisfaction INTEGER CHECK (manager_satisfaction BETWEEN 1 AND 5),
    team_satisfaction INTEGER CHECK (team_satisfaction BETWEEN 1 AND 5),
    compensation_satisfaction INTEGER CHECK (compensation_satisfaction BETWEEN 1 AND 5),
    growth_opportunities_satisfaction INTEGER CHECK (growth_opportunities_satisfaction BETWEEN 1 AND 5),
    work_life_balance_satisfaction INTEGER CHECK (work_life_balance_satisfaction BETWEEN 1 AND 5),
    
    -- Feedback
    what_worked_well TEXT,
    what_could_improve TEXT,
    suggestions_for_improvement TEXT,
    management_feedback TEXT,
    
    -- Rehire & Recommendation
    would_recommend_company BOOLEAN,
    would_consider_returning BOOLEAN,
    would_recommend_manager BOOLEAN,
    
    -- New Employment
    has_new_employment BOOLEAN,
    new_employer_industry VARCHAR(100),
    new_role_title VARCHAR(255),
    
    -- Follow-up
    agreed_to_stay_connected BOOLEAN DEFAULT false,
    alumni_network_interest BOOLEAN DEFAULT false,
    
    -- Confidentiality
    is_confidential BOOLEAN DEFAULT true,
    shared_with JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_exit_interview_org ON hris.exit_interview(organization_id);
CREATE INDEX idx_exit_interview_employee ON hris.exit_interview(employee_id);
CREATE INDEX idx_exit_interview_date ON hris.exit_interview(interview_date);
CREATE INDEX idx_exit_interview_reason ON hris.exit_interview(primary_reason);
```

---

### Phase 8: Career Development & Succession (New)

#### Table: `hris.career_path`
Defines career progression paths within the organization.

**Schema:**
```sql
CREATE TABLE hris.career_path (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Path Information
    path_name VARCHAR(255) NOT NULL,
    description TEXT,
    job_family VARCHAR(100) NOT NULL,
    
    -- Levels in Path
    levels JSONB NOT NULL DEFAULT '[]', -- Array of level definitions with requirements
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_career_path_org ON hris.career_path(organization_id);
CREATE INDEX idx_career_path_family ON hris.career_path(job_family);
```

---

#### Table: `hris.succession_plan`
Identifies potential successors for key positions.

**Schema:**
```sql
CREATE TABLE hris.succession_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Position Information
    position_name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES hris.department(id) ON DELETE SET NULL,
    current_incumbent_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    
    -- Criticality
    is_critical_position BOOLEAN DEFAULT false,
    business_impact_if_vacant TEXT,
    
    -- Timeline
    expected_vacancy_date DATE,
    succession_urgency VARCHAR(50) CHECK (succession_urgency IN ('immediate', 'short_term', 'medium_term', 'long_term')),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_succession_plan_org ON hris.succession_plan(organization_id);
CREATE INDEX idx_succession_plan_position ON hris.succession_plan(current_incumbent_id);
```

---

#### Table: `hris.succession_candidate`
Identifies and tracks potential successors.

**Schema:**
```sql
CREATE TABLE hris.succession_candidate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    succession_plan_id UUID NOT NULL REFERENCES hris.succession_plan(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
    
    -- Readiness
    readiness_level VARCHAR(50) CHECK (readiness_level IN (
        'ready_now',
        'ready_1_year',
        'ready_2_3_years',
        'future_potential'
    )),
    
    -- Assessment
    current_capabilities TEXT,
    development_needs TEXT,
    risk_of_leaving VARCHAR(50) CHECK (risk_of_leaving IN ('low', 'medium', 'high')),
    
    -- Development Plan
    development_actions JSONB DEFAULT '[]',
    mentorship_assigned BOOLEAN DEFAULT false,
    mentor_id UUID REFERENCES hris.employee(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'no_longer_candidate', 'departed')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX idx_succession_candidate_org ON hris.succession_candidate(organization_id);
CREATE INDEX idx_succession_candidate_plan ON hris.succession_candidate(succession_plan_id);
CREATE INDEX idx_succession_candidate_employee ON hris.succession_candidate(employee_id);
CREATE INDEX idx_succession_candidate_readiness ON hris.succession_candidate(readiness_level);
```

---

## Backend Implementation Strategy

### Service Layer Architecture

The backend implementation follows a modular service-oriented architecture with clear separation of concerns:

```
services/
├── employmentHistoryService.js      # Employment periods & rehire
├── positionHistoryService.js        # Career progression tracking
├── promotionService.js              # Promotion workflow
├── compensationService.js           # Salary adjustments & bonuses
├── trainingService.js               # Training & certifications
├── disciplinaryService.js           # Warnings & PIPs
├── transferService.js               # Internal mobility
├── offboardingService.js            # Exit process management
├── careerDevelopmentService.js      # Career paths & succession
└── employeeJourneyService.js        # Unified journey API
```

---

### Phase 1: Employment History Service (Implemented)

#### Service: `employmentHistoryService.js`

**Methods:**
- `createInitialEmployment(employeeData, organizationId, userId)` - Create first employment record
- `terminateEmployee(employeeId, terminationData, organizationId, userId)` - Close current period
- `rehireEmployee(employeeId, rehireData, organizationId, userId)` - Reactivate and create new period
- `getEmploymentHistory(employeeId, organizationId)` - Retrieve all periods
- `getCurrentEmployment(employeeId, organizationId)` - Get active period
- `checkRehireEligibility(employeeId, organizationId)` - Verify can be rehired

**Termination Flow:**
1. Finds current employment_history record
2. Updates with termination details (date, reason, notes, eligibility)
3. Sets `is_current = false` and `end_date`
4. Updates employee record status to 'terminated'
5. All done in transaction for data integrity

**Rehire Flow:**
1. Validates employee is terminated
2. Checks `is_rehire_eligible = true`
3. Updates employee record (reactivates, updates hire_date)
4. Creates new employment_history record with `is_rehire = true`
5. Can assign different department/role/manager
6. All done in transaction

---

### Phase 2: Position History Service (New)

#### Service: `positionHistoryService.js`

**Methods:**
- `createPositionChange(employeeId, changeData, organizationId, userId)` - Record position change
- `getPositionHistory(employeeId, organizationId, filters)` - Retrieve all position changes
- `getCurrentPosition(employeeId, organizationId)` - Get active position
- `calculateTenureInPosition(employeeId, organizationId)` - Time in current role
- `getCareerProgressionTimeline(employeeId, organizationId)` - Full timeline

**Business Logic:**
- Automatically creates `initial_hire` position record when employment starts
- Links to current `employment_history_id`
- Validates no overlapping positions within same employment period
- Denormalizes department/location/manager names for historical integrity
- Supports approval workflow for certain change types

---

### Phase 3: Promotion Service (New)

#### Service: `promotionService.js`

**Methods:**
- `nominatePromotion(nominationData, organizationId, userId)` - Nominate employee
- `approvePromotion(promotionId, approvalData, organizationId, userId)` - Approve promotion
- `rejectPromotion(promotionId, rejectionReason, organizationId, userId)` - Reject nomination
- `executePromotion(promotionId, organizationId, userId)` - Apply promotion changes
- `getPromotionHistory(employeeId, organizationId)` - All promotions
- `getPromotionEligibility(employeeId, organizationId)` - Check if eligible

**Workflow:**
1. Nomination (by manager/HR)
2. Approval (by senior management/HR)
3. Execution:
   - Creates `position_history` record
   - Creates `compensation_adjustment` record (if applicable)
   - Updates employee record
   - Triggers notifications
4. All in transaction

---

### Phase 4: Compensation Service (New)

#### Service: `compensationService.js`

**Methods:**
- `createAdjustment(adjustmentData, organizationId, userId)` - Create compensation change
- `approveAdjustment(adjustmentId, approvalData, organizationId, userId)` - Approve change
- `getCompensationHistory(employeeId, organizationId)` - Full salary history
- `getCurrentCompensation(employeeId, organizationId)` - Current salary details
- `calculateYearOverYearGrowth(employeeId, organizationId)` - Compensation growth
- `getBudgetImpact(adjustmentIds, organizationId)` - Total budget impact

**Integration:**
- Links to promotions
- Links to performance reviews
- Links to position changes
- Triggers payroll sync (if connected to Paylinq)

---

### Phase 5: Training Service (New)

#### Service: `trainingService.js`

**Methods:**
- `enrollEmployee(employeeId, programId, organizationId, userId)` - Enroll in training
- `recordCompletion(recordId, completionData, organizationId, userId)` - Mark complete
- `getTrainingHistory(employeeId, organizationId)` - All training records
- `getPendingTraining(employeeId, organizationId)` - In-progress courses
- `getExpiringCertifications(employeeId, organizationId, daysAhead)` - Expiring certs
- `getSkillsAcquired(employeeId, organizationId)` - Aggregated skills
- `recommendTraining(employeeId, organizationId)` - AI-recommended courses

**Features:**
- Auto-enrollment for mandatory training
- Certification expiry notifications
- Skills matrix generation
- Training ROI tracking

---

### Phase 6: Disciplinary Service (New)

#### Service: `disciplinaryService.js`

**Methods:**
- `issueWarning(employeeId, actionData, organizationId, userId)` - Issue warning
- `createPIP(employeeId, pipData, organizationId, userId)` - Start PIP
- `updatePIPProgress(pipId, progressData, organizationId, userId)` - Update PIP status
- `recordEmployeeAcknowledgement(actionId, acknowledgementData, organizationId, userId)` - Employee signs
- `fileAppeal(actionId, appealData, organizationId, userId)` - Appeal action
- `getDisciplinaryHistory(employeeId, organizationId, includeExpired)` - History
- `getActiveWarnings(employeeId, organizationId)` - Current active warnings

**Security:**
- Highly confidential - restricted access
- Audit trail for all actions
- Employee acknowledgement with signature
- Appeal process support

---

### Phase 7: Transfer Service (New)

#### Service: `transferService.js`

**Methods:**
- `initiateTransfer(transferData, organizationId, userId)` - Start transfer request
- `approveTransfer(transferId, approverId, approverType, organizationId, userId)` - Approve
- `rejectTransfer(transferId, rejectionReason, organizationId, userId)` - Reject
- `executeTransfer(transferId, organizationId, userId)` - Apply transfer
- `getTransferHistory(employeeId, organizationId)` - All transfers
- `getPendingTransfers(organizationId, filters)` - Pending approvals
- `getTemporaryAssignments(employeeId, organizationId)` - Secondments

**Workflow:**
1. Initiation (employee/manager/HR)
2. Current manager approval
3. New manager approval
4. HR approval
5. Execution:
   - Creates `position_history` record
   - Creates `internal_transfer` record
   - Updates employee record
   - Optionally creates `compensation_adjustment`
6. Knowledge transfer tracking

---

### Phase 8: Offboarding Service (New)

#### Service: `offboardingService.js`

**Methods:**
- `initiateOffboarding(employeeId, terminationData, organizationId, userId)` - Start process
- `generateChecklist(offboardingProcessId, organizationId, userId)` - Create tasks
- `updateTaskStatus(taskId, statusData, organizationId, userId)` - Update task
- `scheduleExitInterview(offboardingProcessId, interviewData, organizationId, userId)` - Schedule
- `recordExitInterview(employeeId, interviewData, organizationId, userId)` - Capture interview
- `requestFinalClearance(offboardingProcessId, organizationId, userId)` - Request clearance
- `grantFinalClearance(offboardingProcessId, clearanceData, organizationId, userId)` - Approve clearance
- `getOffboardingProgress(offboardingProcessId, organizationId)` - Progress report
- `getExitInterviewInsights(organizationId, filters)` - Analytics

**Integration:**
- Auto-triggered by employment termination
- Sends task notifications
- Tracks completion percentage
- Generates exit interview reports
- Alumni network opt-in

---

### Phase 9: Career Development Service (New)

#### Service: `careerDevelopmentService.js`

**Methods:**
- `createCareerPath(pathData, organizationId, userId)` - Define career path
- `assignCareerPath(employeeId, pathId, organizationId, userId)` - Assign to employee
- `createSuccessionPlan(planData, organizationId, userId)` - Define succession
- `addSuccessionCandidate(planId, employeeId, candidateData, organizationId, userId)` - Add candidate
- `updateSuccessionReadiness(candidateId, readinessData, organizationId, userId)` - Update readiness
- `getCareerPathProgress(employeeId, organizationId)` - Progress in path
- `getSuccessionPipeline(positionId, organizationId)` - View successors
- `identifyHighPotential(organizationId, criteria)` - HIPO identification

---

### Unified Journey Service (New)

#### Service: `employeeJourneyService.js`

**Purpose:** Provides unified API for retrieving complete employee journey across all modules.

**Methods:**
- `getCompleteJourney(employeeId, organizationId)` - Aggregated timeline
- `getJourneyByCategory(employeeId, category, organizationId)` - Filtered view
- `exportJourneyReport(employeeId, format, organizationId)` - PDF/Excel export
- `getJourneyAnalytics(employeeId, organizationId)` - Key metrics
- `compareJourneys(employeeIds, organizationId)` - Compare multiple employees

**Response Structure:**
```javascript
{
  employee: { /* basic info */ },
  timeline: [
    {
      date: '2023-01-15',
      category: 'employment',
      event_type: 'hire',
      details: { /* event-specific data */ }
    },
    {
      date: '2023-06-01',
      category: 'position',
      event_type: 'promotion',
      details: { /* promotion data */ }
    },
    {
      date: '2023-09-15',
      category: 'compensation',
      event_type: 'merit_increase',
      details: { /* adjustment data */ }
    }
    // ... all events chronologically
  ],
  summary: {
    total_tenure_days: 730,
    promotions_count: 2,
    trainings_completed: 8,
    current_position: { /* current details */ }
  }
}
```

---

### Controller Updates

#### Enhanced: `employeeController.js`

**New Endpoints:**
- `POST /api/nexus/employees/:id/rehire` - Rehire terminated employee
- `GET /api/nexus/employees/:id/employment-history` - Get employment history
- `GET /api/nexus/employees/:id/rehire-eligibility` - Check if can be rehired

**Enhanced Endpoint:**
- `POST /api/nexus/employees/:id/terminate` - Now accepts full termination data

#### New Controllers (Phase 2+):

**`positionHistoryController.js`**
- `GET /api/nexus/employees/:id/position-history` - Position changes
- `POST /api/nexus/employees/:id/position-change` - Record position change
- `GET /api/nexus/employees/:id/career-timeline` - Visual timeline

**`promotionController.js`**
- `POST /api/nexus/promotions/nominate` - Nominate for promotion
- `PUT /api/nexus/promotions/:id/approve` - Approve promotion
- `PUT /api/nexus/promotions/:id/reject` - Reject promotion
- `GET /api/nexus/employees/:id/promotions` - Promotion history

**`compensationController.js`**
- `GET /api/nexus/employees/:id/compensation-history` - Full salary history
- `POST /api/nexus/employees/:id/compensation-adjustment` - Create adjustment
- `PUT /api/nexus/compensation-adjustments/:id/approve` - Approve adjustment
- `GET /api/nexus/compensation-adjustments/pending` - Pending approvals

**`trainingController.js`**
- `GET /api/nexus/employees/:id/training-history` - Training records
- `POST /api/nexus/employees/:id/training/enroll` - Enroll in program
- `PUT /api/nexus/training-records/:id/complete` - Mark complete
- `GET /api/nexus/employees/:id/certifications/expiring` - Expiring certs

**`disciplinaryController.js`**
- `POST /api/nexus/employees/:id/disciplinary-action` - Issue warning/PIP
- `GET /api/nexus/employees/:id/disciplinary-history` - History (restricted)
- `PUT /api/nexus/disciplinary-actions/:id/acknowledge` - Employee acknowledges
- `POST /api/nexus/disciplinary-actions/:id/appeal` - File appeal

**`transferController.js`**
- `POST /api/nexus/transfers/initiate` - Start transfer request
- `PUT /api/nexus/transfers/:id/approve` - Approve transfer
- `GET /api/nexus/employees/:id/transfer-history` - Transfer history
- `GET /api/nexus/transfers/pending` - Pending transfers (for approvers)

**`offboardingController.js`**
- `POST /api/nexus/employees/:id/offboarding/initiate` - Start offboarding
- `GET /api/nexus/offboarding/:id/progress` - Offboarding progress
- `PUT /api/nexus/offboarding-tasks/:id/complete` - Complete task
- `POST /api/nexus/offboarding/:id/exit-interview` - Record exit interview
- `PUT /api/nexus/offboarding/:id/final-clearance` - Grant clearance

**`careerDevelopmentController.js`**
- `GET /api/nexus/career-paths` - Available career paths
- `GET /api/nexus/employees/:id/career-path-progress` - Progress in path
- `GET /api/nexus/succession-plans` - Succession plans
- `GET /api/nexus/succession-plans/:id/candidates` - Succession candidates

**`employeeJourneyController.js`** (Unified API)
- `GET /api/nexus/employees/:id/journey` - Complete journey
- `GET /api/nexus/employees/:id/journey/:category` - Category-specific
- `GET /api/nexus/employees/:id/journey/export` - Export report
- `GET /api/nexus/employees/:id/journey/analytics` - Journey analytics

---

## Frontend Implementation

### Enhanced Services: `employees.service.ts`

**New Methods:**
- `rehire(id, rehireData)` - Call rehire endpoint
- `getEmploymentHistory(id)` - Fetch employment periods
- `checkRehireEligibility(id)` - Check rehire status

### Enhanced Hooks: `useEmployees.ts`

**Phase 1 Hooks (Implemented):**
- `useRehireEmployee()` - Mutation for rehiring
- `useEmploymentHistory(id)` - Query employment history
- `useRehireEligibility(id)` - Query rehire eligibility

**Phase 2+ Hooks (New):**
- `usePositionHistory(id)` - Position changes
- `usePromoteEmployee()` - Promotion mutation
- `usePromotionHistory(id)` - Promotion history
- `useCompensationHistory(id)` - Salary history
- `useCreateCompensationAdjustment()` - Adjustment mutation
- `useTrainingHistory(id)` - Training records
- `useEnrollTraining()` - Enrollment mutation
- `useDisciplinaryHistory(id)` - Disciplinary records (restricted)
- `useIssueDisciplinaryAction()` - Warning/PIP mutation
- `useTransferHistory(id)` - Transfer history
- `useInitiateTransfer()` - Transfer mutation
- `useOffboardingProgress(id)` - Offboarding status
- `useCareerPathProgress(id)` - Career path progress
- `useEmployeeJourney(id)` - Complete journey

---

### UI Component Architecture

#### Enhanced: `EmployeeDetails.tsx`

**New Tab Structure:**
```
Employee Details
├── Overview (basic info)
├── Employment History ✅ (implemented)
├── Career Timeline 🆕 (new)
├── Compensation History 🆕 (new)
├── Performance & Reviews (existing)
├── Training & Certifications 🆕 (new)
├── Documents (existing)
├── Time Off (existing)
└── Actions (terminate/rehire buttons)
```

#### Tab: Employment History ✅ (Implemented)
- Shows timeline of all employment periods
- Visual distinction for current vs past periods
- Displays rehire indicators (🔄 for rehires, ✨ for original hire)
- Shows termination reasons and rehire eligibility
- Includes notes for both termination and rehire events

#### Tab: Career Timeline 🆕 (New)
**Purpose:** Unified visual timeline of all career events

**Components:**
- `<CareerTimeline />` - Master timeline component
- `<TimelineEvent />` - Individual event card
- `<TimelineFilters />` - Filter by category (position, compensation, training, etc.)

**Features:**
- Chronological display of all events (newest first)
- Color-coded by event type:
  - 🟢 Green: Promotions, positive changes
  - 🔵 Blue: Training, certifications
  - 🟡 Yellow: Transfers, role changes
  - 🟠 Orange: Compensation adjustments
  - 🔴 Red: Warnings, disciplinary (if authorized)
  - ⚫ Gray: Employment milestones
- Expandable event cards with full details
- Export timeline as PDF
- Search/filter by date range, category, keyword
- Visual indicators for approvals, pending actions

**Data Integration:**
- Aggregates data from all history tables
- Fetches via `useEmployeeJourney(id)` hook
- Real-time updates via React Query

#### Tab: Compensation History 🆕 (New)
**Purpose:** Track all salary changes, bonuses, adjustments

**Components:**
- `<CompensationChart />` - Visual salary growth chart
- `<CompensationTable />` - Detailed adjustment history
- `<CompensationSummary />` - Key metrics (YoY growth, total increase)

**Features:**
- Line chart showing salary progression over time
- Table with columns:
  - Date
  - Type (annual, merit, promotion, etc.)
  - Previous → New salary
  - Increase % / Amount
  - Reason
  - Approved by
  - Status
- Currency formatting with organization's locale
- Year-over-year growth percentage
- Total compensation earned calculation
- Link to related promotions/reviews
- Export capability

**Security:**
- Restricted to employee, direct manager, HR, payroll
- Audit log for all views

#### Tab: Training & Certifications 🆕 (New)
**Purpose:** Track learning & development journey

**Components:**
- `<TrainingDashboard />` - Overview with stats
- `<TrainingRecordList />` - All training records
- `<CertificationTracker />` - Active certifications
- `<SkillsMatrix />` - Acquired skills visualization

**Features:**
- Training stats: total hours, courses completed, in-progress
- List of all training with status badges
- Expiring certifications alert (red badge if < 30 days)
- Skills acquired aggregated from all training
- Recommended training based on role
- Enroll button for available programs
- Upload certificate documents

#### Tab: Performance & Reviews (Enhanced)
**Existing tab enhanced with:**
- Link to promotions earned from reviews
- Link to compensation adjustments tied to reviews
- Goals progress visualization
- Feedback timeline

---

### New Modal Components

#### `<PromotionModal />`
**Trigger:** Button in Career Timeline tab or Header

**Fields:**
- Promotion Type (vertical, lateral, acting, permanent)
- New Job Title (text input)
- New Job Level (dropdown)
- New Department (dropdown, optional)
- Effective Date (date picker)
- Justification (textarea, required)
- Performance Review (dropdown link, optional)
- Skills Acquired (multi-select)
- Compensation Impact (checkbox to trigger adjustment)
  - If checked: shows compensation adjustment fields

**Workflow:**
1. Manager nominates
2. Submit → Creates promotion record (status: pending)
3. HR/Senior Manager approves → Status: approved
4. Execute → Creates position_history + compensation_adjustment
5. Employee notified

#### `<CompensationAdjustmentModal />`
**Trigger:** Button in Compensation History tab or automatically from promotion

**Fields:**
- Adjustment Type (dropdown: annual, merit, promotion, market, etc.)
- Current Salary (pre-filled, read-only)
- New Salary (number input) OR Adjustment % (auto-calculates)
- Effective Date (date picker)
- Reason (textarea, required)
- Link to Promotion (optional)
- Link to Performance Review (optional)
- Budget Code (text input, optional)

**Approval Workflow:**
1. HR/Manager initiates
2. Submit → Status: pending
3. Approver reviews → Approve/Reject
4. If approved → Updates employee salary + creates history record

#### `<TransferModal />`
**Trigger:** Button in Career Timeline or main actions

**Fields:**
- Transfer Type (dropdown: department, location, temporary, etc.)
- New Department (dropdown)
- New Location (dropdown)
- New Manager (employee picker)
- Effective Date (date picker)
- End Date (if temporary)
- Transfer Reason (dropdown + description)
- Compensation Impact (checkbox)
- Relocation Assistance (checkbox + amount)

**Approval Chain:**
1. Employee/Manager initiates
2. Current manager approves
3. New manager approves
4. HR approves
5. Execute → Creates transfer + position_history

#### `<TrainingEnrollmentModal />`
**Trigger:** Button in Training tab

**Fields:**
- Training Program (dropdown/search)
- Enrollment Date (date picker)
- Target Completion Date (date picker, optional)
- Enrollment Notes (textarea, optional)

**Post-Enrollment:**
- Shows in "In Progress" section
- Sends notification to employee
- Tracks progress

#### `<DisciplinaryActionModal />` 🔒
**Trigger:** Button in admin/manager view (highly restricted)

**Fields:**
- Action Type (verbal warning, written warning, PIP, suspension, etc.)
- Severity Level (minor, moderate, serious, critical)
- Incident Date (date picker)
- Incident Description (textarea, required)
- Violation Category (attendance, conduct, performance, etc.)
- Corrective Measures (textarea)
- Expected Improvement (textarea)
- Review Date (date picker)
- Witnesses (multi-select employees)

**For PIPs:**
- PIP Start/End Date
- Goals (multi-input)
- Review Schedule

**Security:**
- Requires special permission
- Employee acknowledgement required
- Supports appeal process
- Highly confidential audit trail

#### `<OffboardingDashboardModal />`
**Trigger:** Auto-opens when termination initiated (for HR coordinator)

**Sections:**
1. **Checklist Progress** (progress bar + task list)
2. **Asset Return** (checklist items)
3. **Access Revocation** (system access, building access)
4. **Exit Interview** (schedule button → opens scheduler)
5. **Knowledge Transfer** (assign recipient, upload docs)
6. **Final Clearance** (checkbox + notes)

**Task Management:**
- Drag-and-drop task prioritization
- Assign tasks to HR/IT/Finance/Manager
- Set due dates
- Mark complete with notes
- Block tasks until dependencies complete

#### `<ExitInterviewModal />`
**Trigger:** Button in Offboarding Dashboard or scheduled reminder

**Sections:**
- **Interview Details** (date, method, conducted by)
- **Departure Reasons** (primary + secondary from dropdowns)
- **Satisfaction Ratings** (1-5 sliders for job, manager, team, compensation, etc.)
- **Feedback** (what worked well, what could improve, suggestions)
- **Rehire Interest** (would recommend company, consider returning, etc.)
- **New Employment** (has new job, industry, role)
- **Stay Connected** (alumni network opt-in)

**Output:**
- Saved as structured data
- Generates insights report
- Flags issues for HR review

---

### Dashboard & Analytics Views

#### `<EmployeeJourneyDashboard />`
**Location:** Main employee profile page

**Widgets:**
- **Journey Summary Card**
  - Total tenure
  - Current position & level
  - Promotions count
  - Last salary adjustment
  - Training hours completed
  - Active certifications
- **Recent Activity Feed** (last 10 events across all categories)
- **Upcoming Milestones** (anniversaries, cert expirations, review dates)
- **Career Progress Meter** (progress in career path if assigned)

#### `<OrganizationJourneyAnalytics />` 🆕
**Location:** Admin/HR dashboard

**Purpose:** Aggregate insights across all employees

**Metrics:**
- Average time to promotion
- Promotion rate by department
- Training completion rates
- Exit interview themes (NLP analysis)
- Retention rate by cohort
- Compensation growth trends
- High-potential employee pipeline
- Succession plan readiness

**Visualizations:**
- Promotion velocity chart
- Training ROI analysis
- Exit reasons breakdown (pie chart)
- Compensation distribution (box plots)
- Career path progress (funnel chart)

---

## Data Flow Examples

### Complete Employee Journey Query

#### Enhanced Terminate Modal
**New Fields:**
- Termination Date (date picker)
- Termination Reason (dropdown with 8 options)
- Termination Notes (textarea)
- **Eligible for Rehire** (checkbox - defaults to true)

**User Experience:**
- All fields captured during termination
- Clear labeling and help text
- Form validation
- Success/error toast messages

#### New Rehire Modal
**Fields:**
- Rehire Date (date picker)
- Employment Status (dropdown: Active, Probation, On Leave)
- Rehire Notes (textarea)
- Info panel showing previous termination details

**Rehire Button:**
- Only visible when employee is terminated AND rehire-eligible
- Emerald gradient styling with UserPlus icon
- Positioned next to Terminate button in header

**Backend Query:**
```javascript
const journey = await employeeJourneyService.getCompleteJourney(employeeId, organizationId);
// Returns aggregated timeline from all history tables
```

**Frontend Rendering:**
```jsx
const { data: journey } = useEmployeeJourney(employeeId);

<CareerTimeline events={journey.timeline} />
```

---

### Promotion Workflow
```
User clicks "Terminate" → Modal opens with form
  ↓
User fills:
  - Termination date
  - Reason (resignation, layoff, etc.)
  - Notes (optional)
  - Rehire eligible (checkbox)
  ↓
Submit → Backend transaction:
  1. Update employment_history (close period)
  2. Update employee (set status = terminated)
  ↓
Success → Toast + Modal closes + UI refreshes
```

```
User clicks "Promote" button
  ↓
<PromotionModal /> opens
  ↓
User fills form:
  - New title: "Senior Software Engineer"
  - New level: "L4"
  - Effective date: 2025-01-01
  - Justification: "Exceeded goals, led major project"
  - Compensation impact: Yes (+15%)
  ↓
Submit → Backend transaction:
  1. Create promotion record (status: pending)
  2. Create compensation_adjustment record (status: pending, linked to promotion)
  3. Send notification to approver
  ↓
Approver reviews → Clicks "Approve"
  ↓
Backend transaction:
  1. Update promotion (status: approved)
  2. Update compensation_adjustment (status: approved)
  3. Create position_history record (change_type: promotion)
  4. Update employee.job_title, employee.salary
  5. Send notification to employee
  ↓
Success → Timeline updates with new promotion event
```

---

### Training Completion Workflow
```
Employee enrolls in "Advanced Python" course
  ↓
Training record created (status: enrolled)
  ↓
Employee marks as "In Progress"
  ↓
Course completed → Employee/Manager submits completion:
  - Completion date
  - Score/Grade
  - Certificate upload
  - Skills acquired: ['Python', 'Data Analysis']
  ↓
Backend transaction:
  1. Update training_record (status: completed)
  2. Add skills to employee.skills JSONB
  3. Generate completion certificate
  4. Update training hours count
  ↓
Success → Training badge appears on profile
```

---

### Transfer Approval Chain
```
Employee requests transfer to "Engineering - West Coast"
  ↓
<TransferModal /> submission
  ↓
Backend creates transfer record (status: pending)
  ↓
Current manager receives notification → Approves
  ↓
Update transfer.current_manager_approved = true
  ↓
New manager receives notification → Approves
  ↓
Update transfer.new_manager_approved = true
  ↓
HR receives notification → Approves
  ↓
Update transfer.hr_approved = true, overall_status = approved
  ↓
Execute transfer:
  1. Create position_history record
  2. Create internal_transfer record
  3. Update employee (department, location, manager)
  4. Optional: create compensation_adjustment
  5. Trigger knowledge transfer tasks
  ↓
Success → Transfer complete, employee sees new department
```

---

### Offboarding Process End-to-End
```
Manager terminates employee
  ↓
Backend transaction:
  1. Update employment_history (end_date, termination details)
  2. Update employee (status: terminated)
  3. Create offboarding_process record
  4. Generate offboarding tasks from template
  5. Send notifications to HR, IT, Finance
  ↓
HR Coordinator receives offboarding dashboard
  ↓
Tasks assigned and tracked:
  - [HR] Schedule exit interview → Complete
  - [IT] Revoke system access → Complete
  - [Manager] Collect laptop → Complete
  - [Finance] Process final paycheck → Complete
  - [HR] Conduct exit interview → Complete
  ↓
Exit interview conducted:
  - Record satisfaction ratings
  - Capture departure reasons
  - Note rehire interest
  - Save structured feedback
  ↓
All tasks complete → HR grants final clearance
  ↓
Update offboarding_process:
  - completion_percentage: 100%
  - clearance_status: cleared
  - status: completed
  ↓
Success → Offboarding complete
  → Exit interview data feeds analytics
  → Alumni network invitation sent (if opted in)
```

---

### Career Path Progress Tracking
```
New hire assigned "Engineering Career Path"
  ↓
Career path has levels:
  - L1: Junior Engineer (0-2 years)
  - L2: Engineer (2-4 years)
  - L3: Senior Engineer (4-7 years)
  - L4: Staff Engineer (7+ years)
  ↓
Employee currently at L1, hired 2024-01-01
  ↓
Dashboard shows:
  - Current level: L1
  - Time in level: 11 months
  - Next level: L2 (eligible in 13 months)
  - Requirements for L2:
    ✅ 2 years experience (in progress: 55%)
    ✅ Complete "Advanced Development" training
    ❌ Lead a project (not yet)
    ❌ Positive performance review
  ↓
Employee completes requirements over time
  ↓
Manager promotes to L2 (2026-02-01)
  ↓
Dashboard updates:
  - Current level: L2
  - Time in level: 0 months
  - Next level: L3 (eligible in 24 months)
  - Progress visualized in career path chart
```

---

## Data Integrity & Business Rules

### Cross-Table Relationships

**Employment History → Position History**
- Each position change must link to a valid employment period
- Cannot have position changes outside employment dates
- When employment ends, no new position changes allowed

**Position History → Promotions**
- Every promotion creates a position_history record
- position_history.change_type = 'promotion'
- Links via promotion.position_history_id

**Promotions → Compensation Adjustments**
- Promotions can trigger compensation adjustments
- Links via compensation_adjustment.promotion_id
- Not all promotions have compensation impact (lateral moves, title changes)

**Position History → Transfers**
- Every transfer creates a position_history record
- position_history.change_type varies: 'lateral_transfer', 'department_change', 'location_change'
- Links via internal_transfer.position_history_id

**Employment History → Offboarding**
- Termination triggers offboarding process
- Links via offboarding_process.employment_history_id
- One offboarding process per employment period

**Training → Position History**
- Training completion can influence promotion eligibility
- Skills acquired tracked in both tables
- No direct FK, but logical relationship

**Disciplinary Actions → Terminations**
- Severe disciplinary actions can lead to termination
- termination_reason = 'termination_with_cause'
- Impacts rehire eligibility (is_rehire_eligible = false)

---

### Validation Rules

**Employment Dates:**
- end_date must be >= start_date
- No overlapping employment periods (enforced by GIST constraint)
- Only one current period (is_current = true) per employee

**Position Changes:**
- effective_date must be within employment period
- Cannot have promotion with same job_title and job_level
- Manager cannot be self (manager_id != employee_id)

**Compensation:**
- new_salary must be > 0
- For increases: new_salary > previous_salary
- For decreases: must have justification
- effective_date cannot be in future beyond 6 months

**Training:**
- completion_date must be >= start_date
- Cannot complete if status = 'cancelled' or 'failed'
- Certification expiry tracking: sends alert 30 days before expiry

**Disciplinary:**
- Cannot issue action to terminated employee
- PIP end_date must be > start_date (typically 30-90 days)
- Employee acknowledgement required within 7 days
- Expired warnings don't affect current status

**Transfers:**
- Cannot transfer to same department+location
- effective_date must be >= request_date
- For temporary: end_date required and > effective_date
- All approvals required before execution

**Offboarding:**
- Can only initiate for terminated employees
- last_working_day must be >= termination_date
- Cannot grant clearance until all critical tasks complete
- Exit interview optional but recommended

---

## Security & Access Control

### Role-Based Access

**Employee (Self):**
- ✅ View own journey (except disciplinary)
- ✅ View own compensation history
- ✅ View own training records
- ✅ Request transfers
- ✅ Enroll in training
- ✅ Acknowledge disciplinary actions
- ❌ View others' data
- ❌ Issue promotions/adjustments
- ❌ Issue disciplinary actions

**Manager:**
- ✅ View direct reports' journey (except compensation)
- ✅ Nominate promotions for direct reports
- ✅ Initiate transfers
- ✅ Recommend training
- ✅ Issue verbal/written warnings (with HR approval)
- ✅ Initiate compensation adjustments (requires approval)
- ❌ View compensation of non-direct reports
- ❌ Issue severe disciplinary actions (HR only)
- ❌ Grant final offboarding clearance

**HR:**
- ✅ View all employees' complete journey
- ✅ View all compensation history
- ✅ Issue all types of disciplinary actions
- ✅ Approve promotions
- ✅ Approve transfers
- ✅ Manage offboarding process
- ✅ Conduct exit interviews
- ✅ Access organization-wide analytics
- ✅ Grant final clearance

**Payroll:**
- ✅ View compensation history (for payroll processing)
- ✅ View employment dates and status
- ✅ View offboarding dates (for final pay)
- ❌ View disciplinary records
- ❌ View exit interviews
- ❌ Modify non-compensation data

**Executive:**
- ✅ View aggregated analytics (no PII)
- ✅ View succession plans
- ✅ View high-level journey metrics
- ✅ Approve executive promotions
- ❌ View individual disciplinary details (unless involved)

---

### Data Confidentiality

**Public (within organization):**
- Employment history (hire/rehire dates)
- Position changes (job title, department)
- Training completed (public certifications)

**Restricted (manager + HR + self):**
- Performance reviews
- Goals and feedback
- Training scores
- Career path progress

**Confidential (HR + self only):**
- Compensation details
- Salary adjustment history
- Benefits enrollment

**Highly Confidential (HR + involved parties):**
- Disciplinary actions
- Exit interview responses
- Offboarding issues
- PIP details

---

### Audit Trail

**Every action logged:**
- Who made the change (created_by, updated_by)
- When (created_at, updated_at)
- What changed (stored in audit_log table)
- Why (reason fields in most tables)

**Audit Log Captures:**
```sql
INSERT INTO hris.audit_log (
  organization_id,
  table_name,
  record_id,
  action,
  old_values,
  new_values,
  changed_fields,
  user_id,
  ip_address,
  user_agent
) VALUES (...);
```

**Retention:**
- Audit logs retained for 7 years (compliance)
- Historical data never deleted (soft deletes only)
- Denormalized names prevent data loss if related records deleted

---

## Reporting & Analytics

### Individual Employee Reports

**Journey Report (PDF Export):**
- Executive summary (tenure, promotions, training)
- Complete chronological timeline
- Position history with dates
- Compensation growth chart
- Training & certifications list
- Performance review summaries
- Key achievements
- Generated on-demand or for exit/promotion packets

**Compensation Statement:**
- Current salary & benefits
- Historical salary progression
- Year-over-year growth %
- Total compensation earned
- Comparison to market data (if available)

**Training Transcript:**
- All courses completed
- Certifications obtained
- Skills acquired
- Total training hours
- Continuing education credits

---

### Organization-Wide Analytics

**Talent Metrics:**
- Headcount by department/location
- Turnover rate (voluntary vs involuntary)
- Average tenure
- Time to fill positions
- Internal mobility rate

**Promotion Analytics:**
- Average time to promotion
- Promotion rate by demographics
- Promotion velocity by department
- Success rate of promoted employees

**Compensation Analytics:**
- Salary distribution by role/level
- Pay equity analysis
- Merit increase trends
- Promotion impact on compensation
- Budget forecasting

**Training ROI:**
- Training spend per employee
- Completion rates by program
- Skills gap analysis
- Correlation: training → promotions
- Certification expiry forecasting

**Exit Analysis:**
- Top exit reasons (from interviews)
- Retention by manager/department
- Voluntary vs involuntary trends
- Rehire eligibility rate
- Alumni network engagement

**Succession Readiness:**
- Critical positions covered
- Pipeline depth by role
- High-potential employee count
- Succession risk score

---

### Scheduled Reports

**Monthly:**
- New hires, terminations, transfers
- Promotions and compensation changes
- Training completions
- Expiring certifications
- Pending approvals

**Quarterly:**
- Turnover analysis
- Compensation review
- Succession plan updates
- Performance review cycles

**Annual:**
- Full talent review
- Compensation benchmarking
- Training effectiveness
- Exit interview themes
- DEI metrics

---

## Implementation Roadmap

### Phase 1: Foundation (Completed ✅)
**Timeline:** 2 weeks
- ✅ Employment history table & service
- ✅ Termination workflow
- ✅ Rehire workflow
- ✅ Frontend UI (modals, tabs)
- ✅ Testing & deployment

---

### Phase 2: Career Progression (Priority 1)
**Timeline:** 3 weeks

**Week 1:**
- Position history table & service
- Position change tracking
- Career timeline UI component

**Week 2:**
- Promotion table & service
- Promotion workflow (nomination → approval → execution)
- Promotion modal UI

**Week 3:**
- Testing & bug fixes
- Documentation
- Deploy to production

---

### Phase 3: Compensation Management (Priority 1)
**Timeline:** 2 weeks

**Week 1:**
- Compensation adjustment table & service
- Approval workflow
- Integration with promotions

**Week 2:**
- Compensation history UI
- Compensation chart
- Testing & deployment

---

### Phase 4: Training & Development (Priority 2)
**Timeline:** 3 weeks

**Week 1:**
- Training program & record tables
- Training service & enrollment logic

**Week 2:**
- Training history UI
- Certification tracker
- Skills matrix

**Week 3:**
- Expiry notifications
- Testing & deployment

---

### Phase 5: Internal Mobility (Priority 2)
**Timeline:** 2 weeks

**Week 1:**
- Internal transfer table & service
- Multi-step approval workflow

**Week 2:**
- Transfer modal UI
- Pending approvals dashboard
- Testing & deployment

---

### Phase 6: Offboarding (Priority 1)
**Timeline:** 3 weeks

**Week 1:**
- Offboarding tables (process, tasks, checklist template)
- Offboarding service & task management

**Week 2:**
- Exit interview table & service
- Offboarding dashboard UI
- Task assignment & tracking

**Week 3:**
- Exit interview modal
- Analytics integration
- Testing & deployment

---

### Phase 7: Disciplinary Management (Priority 3)
**Timeline:** 2 weeks

**Week 1:**
- Disciplinary action table & service
- PIP workflow
- Appeal process

**Week 2:**
- Restricted UI (HR only)
- Employee acknowledgement flow
- Testing & deployment

---

### Phase 8: Career Development & Succession (Priority 3)
**Timeline:** 3 weeks

**Week 1:**
- Career path tables & service
- Path assignment logic

**Week 2:**
- Succession plan tables & service
- Candidate tracking

**Week 3:**
- UI for career paths
- Succession dashboard
- Testing & deployment

---

### Phase 9: Unified Journey & Analytics (Priority 1)
**Timeline:** 2 weeks

**Week 1:**
- Employee journey service (aggregation logic)
- Journey API endpoints
- Journey dashboard UI

**Week 2:**
- Organization analytics views
- Export functionality (PDF/Excel)
- Testing & deployment

---

### Phase 10: Advanced Features (Priority 4)
**Timeline:** Ongoing

- **AI-Powered Insights:** Predictive attrition, flight risk, promotion readiness
- **Workflow Automation:** Auto-approvals based on rules, notifications
- **Integration:** Sync with Paylinq (compensation), ScheduleHub (attendance)
- **Mobile App:** Mobile-friendly views for approvals, training enrollment
- **Benchmarking:** Industry salary comparisons, market data integration
- **Gamification:** Badges for training, milestones, achievements
- **Alumni Network:** Post-exit engagement, boomerang hiring

---

## Testing Strategy

### Unit Tests

**Backend Services:**
- Test each CRUD operation
- Test business logic (validations, calculations)
- Test error handling
- Test transaction rollbacks
- Mock database calls

**Example:**
```javascript
describe('positionHistoryService', () => {
  test('createPositionChange - creates position record', async () => {
    const result = await positionHistoryService.createPositionChange(
      employeeId, changeData, orgId, userId
    );
    expect(result.id).toBeDefined();
    expect(result.change_type).toBe('promotion');
  });
  
  test('createPositionChange - validates effective date', async () => {
    await expect(
      positionHistoryService.createPositionChange(
        employeeId, { effective_date: '2020-01-01' }, orgId, userId
      )
    ).rejects.toThrow('Effective date must be within employment period');
  });
});
```

---

### Integration Tests

**API Endpoints:**
- Test complete request/response cycle
- Test authentication & authorization
- Test query parameters & filters
- Test error responses

**Example:**
```javascript
describe('POST /api/nexus/promotions/nominate', () => {
  test('nominates employee for promotion', async () => {
    const response = await request(app)
      .post('/api/nexus/promotions/nominate')
      .set('Authorization', `Bearer ${token}`)
      .send(promotionData);
    
    expect(response.status).toBe(201);
    expect(response.body.promotion.status).toBe('pending');
  });
  
  test('rejects unauthorized nomination', async () => {
    const response = await request(app)
      .post('/api/nexus/promotions/nominate')
      .send(promotionData); // No token
    
    expect(response.status).toBe(401);
  });
});
```

---

### E2E Tests (Playwright)

**User Journeys:**
- Test complete workflows from UI
- Test multi-step processes (approval chains)
- Test data consistency across pages

**Example:**
```javascript
test('promote employee workflow', async ({ page }) => {
  // Navigate to employee details
  await page.goto(`/employees/${employeeId}`);
  
  // Click promote button
  await page.click('button:has-text("Promote")');
  
  // Fill promotion form
  await page.fill('input[name="newJobTitle"]', 'Senior Engineer');
  await page.selectOption('select[name="newJobLevel"]', 'L4');
  await page.fill('textarea[name="justification"]', 'Excellent performance');
  
  // Submit
  await page.click('button:has-text("Submit")');
  
  // Verify success message
  await expect(page.locator('.toast-success')).toContainText('Promotion nominated');
  
  // Verify timeline updated
  await page.click('text=Career Timeline');
  await expect(page.locator('.timeline-event').first()).toContainText('Promotion');
});
```

---

### Data Integrity Tests

**Database Constraints:**
- Test unique constraints
- Test foreign key constraints
- Test check constraints
- Test GIST constraints (no overlapping periods)

**Example:**
```sql
-- Test: Cannot have overlapping employment periods
BEGIN;
  INSERT INTO hris.employment_history (employee_id, start_date, end_date, ...) 
  VALUES ('emp-1', '2024-01-01', '2024-12-31', ...);
  
  -- This should fail
  INSERT INTO hris.employment_history (employee_id, start_date, end_date, ...) 
  VALUES ('emp-1', '2024-06-01', '2025-06-01', ...);
  -- ERROR: overlapping employment periods
ROLLBACK;
```

---

### Performance Tests

**Load Testing:**
- Test API response times under load
- Test database query performance
- Test concurrent updates

**Targets:**
- API response < 200ms (p95)
- Database queries < 50ms
- Support 100 concurrent users

**Tools:**
- k6 for load testing
- pg_stat_statements for query analysis

---

## Migration & Rollout Strategy

### Phase 1: Data Migration

**Step 1: Backfill Employment History**
```sql
-- Create initial employment_history records for all existing employees
INSERT INTO hris.employment_history (
  organization_id, employee_id, start_date, is_current, 
  employment_status, employment_type, department_id, job_title, ...
)
SELECT 
  organization_id, id, hire_date, 
  (employment_status != 'terminated'),
  employment_status, employment_type, department_id, job_title, ...
FROM hris.employee
WHERE deleted_at IS NULL;
```

**Step 2: Create Initial Position Records**
```sql
-- Create position_history record for each employee's current position
INSERT INTO hris.position_history (
  organization_id, employee_id, employment_history_id,
  change_type, effective_date, job_title, department_id, ...
)
SELECT 
  e.organization_id, e.id, eh.id,
  'initial_hire', e.hire_date, e.job_title, e.department_id, ...
FROM hris.employee e
JOIN hris.employment_history eh ON e.id = eh.employee_id AND eh.is_current = true
WHERE e.deleted_at IS NULL;
```

---

### Phase 2: Feature Flags

Enable features gradually:
- `ENABLE_POSITION_HISTORY` = true
- `ENABLE_PROMOTIONS` = false (until ready)
- `ENABLE_COMPENSATION_TRACKING` = false
- etc.

---

### Phase 3: User Training

**Week 1-2:** HR Team
- Training sessions on new features
- Documentation walkthrough
- Q&A sessions

**Week 3:** Managers
- How to nominate promotions
- How to initiate transfers
- How to view team analytics

**Week 4:** All Employees
- How to view own journey
- How to enroll in training
- How to request transfers

---

### Phase 4: Gradual Rollout

**Pilot Group (Week 1):**
- HR department only
- Monitor for bugs
- Gather feedback

**Expansion (Week 2-3):**
- Roll out to Engineering dept
- Roll out to Sales dept
- Continue monitoring

**Full Release (Week 4):**
- Enable for all departments
- Monitor performance
- Iterate based on feedback

---

## Performance Optimization

### Database Indexes

**Critical Indexes (Already Defined):**
```sql
-- Employee lookup
CREATE INDEX idx_employee_org ON hris.employee(organization_id);
CREATE INDEX idx_employee_status ON hris.employee(employment_status);

-- History queries
CREATE INDEX idx_position_history_employee ON hris.position_history(employee_id);
CREATE INDEX idx_position_history_effective_date ON hris.position_history(effective_date);

-- Timeline queries (composite)
CREATE INDEX idx_journey_timeline ON hris.position_history(employee_id, effective_date DESC);
```

**Additional Composite Indexes:**
```sql
-- Fast journey aggregation
CREATE INDEX idx_employment_history_journey 
ON hris.employment_history(employee_id, start_date, is_current);

-- Pending approvals (heavily queried)
CREATE INDEX idx_promotion_pending 
ON hris.promotion(approval_status, organization_id) 
WHERE approval_status = 'pending';

CREATE INDEX idx_compensation_pending 
ON hris.compensation_adjustment(approval_status, organization_id) 
WHERE approval_status = 'pending';
```

---

### Query Optimization

**Denormalization:**
- Store department/manager names in history tables (avoid JOINs)
- Pre-calculate summary fields (total_promotions, total_training_hours)
- Cache frequently accessed data in Redis

**Pagination:**
- Always paginate large result sets (history queries)
- Use cursor-based pagination for timelines
- Limit default page size to 50 records

**Partial Queries:**
- Only fetch needed fields (SELECT specific columns, not *)
- Use GraphQL for client-specified fields (future enhancement)

---

### Caching Strategy

**React Query (Frontend):**
```javascript
// Cache journey data for 5 minutes
const { data: journey } = useEmployeeJourney(employeeId, {
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000
});
```

**Redis (Backend):**
```javascript
// Cache complete journey for 5 minutes
const cacheKey = `journey:${employeeId}`;
let journey = await redis.get(cacheKey);

if (!journey) {
  journey = await employeeJourneyService.getCompleteJourney(employeeId, orgId);
  await redis.setex(cacheKey, 300, JSON.stringify(journey)); // 5 min TTL
}
```

**Invalidation:**
- Invalidate cache on any journey-related update
- Use cache tags for batch invalidation

---

### Async Processing

**Background Jobs:**
- Offboarding task generation (can be slow)
- Exit interview analytics (NLP processing)
- PDF report generation
- Bulk operations (mass promotions, transfers)

**Queue System (Bull/Redis):**
```javascript
// Enqueue offboarding process
await offboardingQueue.add('generateTasks', {
  offboardingProcessId,
  organizationId
});

// Worker processes job asynchronously
offboardingQueue.process('generateTasks', async (job) => {
  const { offboardingProcessId, organizationId } = job.data;
  await offboardingService.generateChecklistTasks(offboardingProcessId, organizationId);
});
```

---

## Security Considerations

### SQL Injection Prevention
- Use parameterized queries (pg library)
- Never concatenate user input into SQL
- Validate all input server-side

### Authorization Checks
- Every API endpoint checks user permissions
- Organization-scoped queries (prevent cross-tenant access)
- Role-based access control (RBAC)

### Data Encryption
- Encrypt sensitive fields at rest (compensation, disciplinary)
- Use HTTPS for all API calls
- Hash any passwords/tokens (already done in user_account)

### Audit Logging
- Log all sensitive data access
- Log all modifications with user context
- Retain logs for compliance (7 years)

### GDPR Compliance
- Right to access: Export journey report
- Right to erasure: Soft delete with anonymization
- Right to portability: Export in machine-readable format
- Data minimization: Only collect necessary fields

---

## Future Enhancements

### Advanced Analytics
- **Predictive Models:** Flight risk prediction, promotion readiness, attrition forecasting
- **NLP Analysis:** Auto-categorize exit interview themes, sentiment analysis
- **Benchmarking:** Compare to industry standards, market salary data

### Workflow Automation
- **Auto-Approvals:** Rule-based auto-approve (e.g., transfers within same level)
- **Smart Notifications:** Notify at right time (cert expiring, review due)
- **Scheduled Actions:** Auto-promote on specific date, auto-expire warnings

### Integration Ecosystem
- **Paylinq Sync:** Auto-sync compensation changes to payroll
- **ScheduleHub Sync:** Attendance impacts performance reviews
- **RecruitIQ Sync:** Candidate → Employee seamless transition
- **ATS Integration:** Import candidate journey into employee journey

### AI-Powered Features
- **Career Path Recommendations:** ML suggests optimal career path
- **Skill Gap Analysis:** AI identifies training needs
- **Successor Identification:** AI ranks succession candidates
- **Compensation Equity:** AI detects pay disparities

### Mobile App
- **Manager Dashboard:** Approve promotions/transfers on mobile
- **Employee Self-Service:** View journey, enroll training on-the-go
- **Push Notifications:** Real-time alerts for approvals, milestones

### Gamification
- **Achievement Badges:** Complete training, hit milestones
- **Leaderboards:** Top learners, most certifications
- **Career Levels:** Visual progression, unlockable perks

---

## Success Metrics

### Adoption Metrics
- % employees with complete journey data
- % managers using promotion workflow
- % HR using offboarding dashboard
- Daily active users on journey page

### Efficiency Metrics
- Time to complete offboarding (target: < 7 days)
- Promotion cycle time (nomination → execution)
- Transfer approval time (target: < 5 days)
- Exit interview completion rate (target: > 90%)

### Data Quality Metrics
- % employees with at least 1 position record
- % terminations with exit interviews
- % promotions with linked compensation adjustments
- Audit log coverage (target: 100%)

### Business Impact Metrics
- Voluntary turnover rate (track trend)
- Internal mobility rate (target: > 15%)
- Training completion rate (target: > 80%)
- Succession plan coverage (target: > 90% of critical roles)

---

## Appendix

### Glossary

- **Employment Period:** Continuous time employed (hire → termination)
- **Position Change:** Any change in role, department, location, manager
- **Promotion:** Upward career move (vertical or with increased scope)
- **Lateral Transfer:** Move without promotion (same level, different dept/location)
- **PIP:** Performance Improvement Plan (formal corrective action)
- **Succession Plan:** Strategy to fill key positions when vacant
- **HIPO:** High-Potential employee (succession candidate)
- **Offboarding:** Structured exit process for departing employees
- **Exit Interview:** Structured conversation capturing departure reasons
- **Rehire Eligibility:** Whether former employee can be rehired

---

### API Reference Summary

**Base URL:** `/api/nexus`

**Employment History:**
- `GET /employees/:id/employment-history` - All employment periods
- `POST /employees/:id/terminate` - Terminate employee
- `POST /employees/:id/rehire` - Rehire employee

**Position History:**
- `GET /employees/:id/position-history` - All position changes
- `POST /employees/:id/position-change` - Record position change
- `GET /employees/:id/career-timeline` - Visual timeline

**Promotions:**
- `POST /promotions/nominate` - Nominate promotion
- `PUT /promotions/:id/approve` - Approve promotion
- `GET /employees/:id/promotions` - Promotion history

**Compensation:**
- `GET /employees/:id/compensation-history` - Salary history
- `POST /employees/:id/compensation-adjustment` - Create adjustment
- `PUT /compensation-adjustments/:id/approve` - Approve adjustment

**Training:**
- `GET /employees/:id/training-history` - Training records
- `POST /employees/:id/training/enroll` - Enroll in program
- `PUT /training-records/:id/complete` - Mark complete

**Transfers:**
- `POST /transfers/initiate` - Start transfer
- `PUT /transfers/:id/approve` - Approve transfer
- `GET /employees/:id/transfer-history` - Transfer history

**Offboarding:**
- `POST /employees/:id/offboarding/initiate` - Start offboarding
- `GET /offboarding/:id/progress` - Progress status
- `POST /offboarding/:id/exit-interview` - Record interview

**Journey (Unified):**
- `GET /employees/:id/journey` - Complete journey
- `GET /employees/:id/journey/export` - Export report

---

### Data Flow Diagram (Termination → Rehire)
```
Terminated employee page loads
  ↓
Fetch rehire eligibility → Show/hide Rehire button
  ↓
User clicks "Rehire" → Modal opens with form
  ↓
User fills:
  - Rehire date
  - Employment status
  - Notes (optional)
  ↓
Submit → Backend transaction:
  1. Validate eligibility
  2. Update employee (reactivate)
  3. Create new employment_history (is_rehire=true)
  ↓
Success → Toast + Modal closes + Status changes to Active
```

### Termination Process (Phase 1 - Implemented)
```
User clicks "Terminate" → Modal opens with form
  ↓
User fills:
  - Termination date
  - Reason (resignation, layoff, etc.)
  - Notes (optional)
  - Rehire eligible (checkbox)
  ↓
Submit → Backend transaction:
  1. Update employment_history (close period)
  2. Update employee (set status = terminated)
  3. Trigger offboarding process (Phase 6)
  ↓
Success → Toast + Modal closes + UI refreshes
```

```
Terminated employee page loads
  ↓
Fetch rehire eligibility → Show/hide Rehire button
  ↓
User clicks "Rehire" → Modal opens with form
  ↓
User fills:
  - Rehire date
  - Employment status
  - Notes (optional)
  ↓
Submit → Backend transaction:
  1. Validate eligibility
  2. Update employee (reactivate)
  3. Create new employment_history (is_rehire=true)
  4. Create initial position_history record (Phase 2)
  ↓
Success → Toast + Modal closes + Status changes to Active
```

### Employment History Tab
```
User clicks "Employment History" tab
  ↓
Fetch all employment_history records
  ↓
Display timeline (newest first):
  - Current period highlighted in green
  - Rehire indicators
  - Job title, department, dates
  - Termination reasons if applicable
  - Rehire eligibility status
  - All notes
```

---

## Business Rules Summary

### Termination
- Can only terminate `active` employees
- Must provide termination date (defaults to today)
- Must select termination reason
- Notes are optional
- Rehire eligibility defaults to `true` but can be unchecked

### Rehire
- Can only rehire `terminated` employees
- Must have `is_rehire_eligible = true` on last employment period
- Creates new employment period (doesn't modify old one)
- Can assign different department/role/manager
- New period starts fresh (no carry-over of old data)

### Employment History
- One CURRENT period maximum per employee (enforced by DB)
- No overlapping periods (enforced by GIST constraint)
- Historical data preserved forever
- Denormalized names preserve context even if dept/manager deleted

### Position Changes
- Must link to valid employment period
- Cannot change position outside employment dates
- Every hire/rehire creates initial position record
- Promotion/transfer creates position record with appropriate change_type

### Promotions
- Requires nomination (by manager/HR)
- Requires approval (by senior management/HR)
- Execution creates position_history + optional compensation_adjustment
- Cannot promote to same title+level

### Compensation
- All adjustments require approval (except system-generated)
- New salary must be > 0
- Links to promotions, reviews, transfers when applicable
- Triggers payroll sync if Paylinq connected

### Training
- Mandatory training auto-enrolled
- Completion requires date + optional score/certificate
- Certifications tracked for expiry
- Skills acquired added to employee profile

### Disciplinary Actions
- Highly restricted access (HR + involved parties)
- Employee acknowledgement required
- Supports appeal process
- Can impact promotion/bonus eligibility
- Warnings can expire (configurable)

### Transfers
- Multi-step approval (current manager → new manager → HR)
- Can be permanent or temporary
- Temporary transfers have end_date
- Knowledge transfer tracking required

### Offboarding
- Auto-triggered by termination
- Checklist generated from template
- Tasks assigned to HR/IT/Finance/Manager
- Exit interview optional but recommended
- Final clearance required to complete

---

## Testing Scenarios (Phase 1)

### Happy Path - Termination
1. Navigate to active employee
2. Click "Terminate"
3. Fill form with resignation reason
4. Check "Eligible for Rehire"
5. Submit
6. Verify status changes to "Terminated"
7. Verify "Employment History" tab shows closed period

### Happy Path - Rehire
1. Navigate to terminated employee (rehire-eligible)
2. Verify "Rehire" button visible
3. Click "Rehire"
4. Fill form with rehire date
5. Submit
6. Verify status changes to "Active"
7. Verify "Employment History" shows 2 periods (original + rehire)

### Edge Cases (Phase 1)
- Terminating with "not eligible for rehire" → Rehire button hidden
- Attempting rehire of ineligible employee → 403 error
- Overlapping employment periods → DB constraint error
- Multiple current periods → DB constraint error

### Extended Testing (Phases 2-8)

**Promotion Tests:**
- Nominate → Approve → Execute flow
- Reject promotion (with reason)
- Promote with compensation increase
- Lateral promotion (same level, different dept)

**Compensation Tests:**
- Annual merit increase approval
- Market adjustment with business justification
- Retroactive adjustment calculation
- Budget impact validation

**Training Tests:**
- Mandatory training auto-enrollment
- Certification expiry alert (30 days before)
- Skills matrix aggregation
- Training ROI calculation

**Transfer Tests:**
- Three-step approval chain
- Temporary assignment with end date
- Transfer with relocation assistance
- Knowledge transfer tracking

**Disciplinary Tests:**
- Issue verbal warning
- Create PIP with goals and timeline
- Employee acknowledgement flow
- Appeal process

**Offboarding Tests:**
- Auto-generate checklist from template
- Task assignment and completion
- Exit interview data capture
- Final clearance gate

---

**Phase 1 Security (Implemented):**
- All endpoints require authentication
- Organization-scoped queries prevent cross-tenant access
- Transaction-based updates ensure data integrity
- Audit trail via created_by/updated_by fields
- Soft deletes preserve data for compliance

**Extended Security (Phases 2-8):**
- Role-based access control (RBAC) for sensitive data
- Compensation history restricted to employee/manager/HR/payroll
- Disciplinary records highly confidential (HR + involved parties only)
- Exit interviews confidential (HR + executive summary only)
- Encryption at rest for sensitive fields
- Audit log for all data access (not just modifications)
- GDPR compliance (right to access, erasure, portability)

---

## Performance Optimizations

**Phase 1 (Implemented):**
- Indexed queries on employee_id, is_current
- Denormalized names reduce JOINs on history queries
- Efficient GIST index for overlap detection
- React Query caching with 5min stale time
- Optimistic updates for better UX

**Extended Optimizations (Phases 2+):**
- Composite indexes for journey timeline queries
- Redis caching for frequently accessed data
- Pagination for large result sets (history queries)
- Async processing for heavy operations (PDF generation, analytics)
- Database query optimization (SELECT specific fields, avoid N+1)
- CDN for document storage (certificates, exit interview recordings)

---

## Migration Strategy

**Existing Employees:**
- Current `hire_date` and `termination_date` remain in employee table
- New `employment_history` table starts empty
- Consider backfill script to create initial records for existing employees
- Script should create ONE record per employee with current status

**Backfill SQL (example):**
```sql
INSERT INTO hris.employment_history (
  organization_id, employee_id, start_date, is_current, 
  employment_status, employment_type, department_id, job_title
)
SELECT 
  organization_id, id, hire_date, 
  (employment_status != 'terminated'),
  employment_status, employment_type, department_id, job_title
FROM hris.employee
WHERE deleted_at IS NULL;
```

## Files Modified/Created

### Phase 1: Employment History & Rehire ✅ (Completed)

**Backend:**
- ✅ `backend/src/database/nexus-hris-schema.sql` - Added employment_history table
- ✅ `backend/src/products/nexus/services/employmentHistoryService.js` - New service (480 lines)
- ✅ `backend/src/products/nexus/controllers/employeeController.js` - Added 4 methods
- ✅ `backend/src/products/nexus/routes/index.js` - Added 3 routes

**Frontend:**
- ✅ `apps/nexus/src/services/employees.service.ts` - Added 3 methods
- ✅ `apps/nexus/src/hooks/useEmployees.ts` - Added 3 hooks
- ✅ `apps/nexus/src/pages/employees/EmployeeDetails.tsx` - Major enhancements:
  - Enhanced terminate modal (5 fields)
  - New rehire modal
  - New employment history tab
  - Conditional rehire button

---

### Phase 2-8: Extended Journey Tracking 🆕 (Planned)

**Backend Files to Create:**
- `backend/src/database/migrations/002_position_history.sql` - Position tracking schema
- `backend/src/database/migrations/003_promotions_compensation.sql` - Promotion & comp schemas
- `backend/src/database/migrations/004_training.sql` - Training schemas
- `backend/src/database/migrations/005_disciplinary.sql` - Disciplinary schemas
- `backend/src/database/migrations/006_transfers.sql` - Transfer schemas
- `backend/src/database/migrations/007_offboarding.sql` - Offboarding schemas
- `backend/src/database/migrations/008_career_development.sql` - Career path & succession schemas
- `backend/src/products/nexus/services/positionHistoryService.js`
- `backend/src/products/nexus/services/promotionService.js`
- `backend/src/products/nexus/services/compensationService.js`
- `backend/src/products/nexus/services/trainingService.js`
- `backend/src/products/nexus/services/disciplinaryService.js`
- `backend/src/products/nexus/services/transferService.js`
- `backend/src/products/nexus/services/offboardingService.js`
- `backend/src/products/nexus/services/careerDevelopmentService.js`
- `backend/src/products/nexus/services/employeeJourneyService.js` - Unified API
- `backend/src/products/nexus/controllers/positionHistoryController.js`
- `backend/src/products/nexus/controllers/promotionController.js`
- `backend/src/products/nexus/controllers/compensationController.js`
- `backend/src/products/nexus/controllers/trainingController.js`
- `backend/src/products/nexus/controllers/disciplinaryController.js`
- `backend/src/products/nexus/controllers/transferController.js`
- `backend/src/products/nexus/controllers/offboardingController.js`
- `backend/src/products/nexus/controllers/careerDevelopmentController.js`
- `backend/src/products/nexus/controllers/employeeJourneyController.js`

**Frontend Files to Create:**
- `apps/nexus/src/services/positionHistory.service.ts`
- `apps/nexus/src/services/promotions.service.ts`
- `apps/nexus/src/services/compensation.service.ts`
- `apps/nexus/src/services/training.service.ts`
- `apps/nexus/src/services/disciplinary.service.ts`
- `apps/nexus/src/services/transfers.service.ts`
- `apps/nexus/src/services/offboarding.service.ts`
- `apps/nexus/src/services/careerDevelopment.service.ts`
- `apps/nexus/src/services/employeeJourney.service.ts`
- `apps/nexus/src/hooks/usePositionHistory.ts`
- `apps/nexus/src/hooks/usePromotions.ts`
- `apps/nexus/src/hooks/useCompensation.ts`
- `apps/nexus/src/hooks/useTraining.ts`
- `apps/nexus/src/hooks/useDisciplinary.ts`
- `apps/nexus/src/hooks/useTransfers.ts`
- `apps/nexus/src/hooks/useOffboarding.ts`
- `apps/nexus/src/hooks/useCareerDevelopment.ts`
- `apps/nexus/src/hooks/useEmployeeJourney.ts`
- `apps/nexus/src/components/employee/CareerTimeline.tsx` - Master timeline
- `apps/nexus/src/components/employee/TimelineEvent.tsx` - Event card
- `apps/nexus/src/components/employee/CompensationHistory.tsx` - Comp tab
- `apps/nexus/src/components/employee/CompensationChart.tsx` - Salary chart
- `apps/nexus/src/components/employee/TrainingDashboard.tsx` - Training tab
- `apps/nexus/src/components/employee/CertificationTracker.tsx` - Cert widget
- `apps/nexus/src/components/employee/SkillsMatrix.tsx` - Skills visualization
- `apps/nexus/src/components/modals/PromotionModal.tsx`
- `apps/nexus/src/components/modals/CompensationAdjustmentModal.tsx`
- `apps/nexus/src/components/modals/TransferModal.tsx`
- `apps/nexus/src/components/modals/TrainingEnrollmentModal.tsx`
- `apps/nexus/src/components/modals/DisciplinaryActionModal.tsx`
- `apps/nexus/src/components/modals/OffboardingDashboardModal.tsx`
- `apps/nexus/src/components/modals/ExitInterviewModal.tsx`
- `apps/nexus/src/pages/employees/EmployeeJourneyDashboard.tsx` - Journey view
- `apps/nexus/src/pages/analytics/OrganizationJourneyAnalytics.tsx` - Org analytics

---

## Summary

This architecture provides **complete employee lifecycle management** for Nexus HRIS:

### Phase 1 (Completed ✅)
- ✅ Track multiple employment periods per employee
- ✅ Capture detailed termination reasons and eligibility
- ✅ Enable rehiring with full workflow
- ✅ Preserve complete employment history
- ✅ Enforce data integrity with DB constraints
- ✅ Intuitive UI/UX with modals and tabs
- ✅ Proper separation of concerns (HRIS vs Payroll)

### Phases 2-8 (Planned 🆕)
- 🎯 **Career Progression:** Track all position changes, promotions, career levels
- 🎯 **Compensation Management:** Complete salary history, adjustments, approval workflows
- 🎯 **Training & Development:** Courses, certifications, skills tracking
- 🎯 **Disciplinary Management:** Warnings, PIPs, appeals (restricted access)
- 🎯 **Internal Mobility:** Transfers, secondments, multi-step approvals
- 🎯 **Offboarding Excellence:** Structured exit process, task management, exit interviews
- 🎯 **Career Development:** Career paths, succession planning, high-potential tracking
- 🎯 **Unified Journey View:** Single API to access complete employee timeline
- 🎯 **Analytics & Insights:** Organization-wide metrics, predictive analytics

### Key Benefits
- **Complete Journey Visibility:** Every significant event captured and queryable
- **Data Integrity:** Historical snapshots, audit trails, constraint enforcement
- **Compliance Ready:** GDPR-compliant, 7-year retention, soft deletes
- **Scalable Architecture:** Modular services, efficient queries, caching strategies
- **User-Friendly:** Intuitive UI, visual timelines, approval workflows
- **Actionable Insights:** Analytics drive decisions, identify trends, predict outcomes

The system now handles the **full employee lifecycle** from hire through termination and potential rehire, with complete career progression tracking, performance management, and offboarding excellence.
