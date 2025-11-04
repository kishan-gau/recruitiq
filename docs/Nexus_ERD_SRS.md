# Nexus – Software Requirements Specification (SRS) & ERD

---

## 📘 Software Requirements Specification (SRS)

### 1. Introduction

#### 1.1 Purpose
Nexus is a modular, rule-driven Human Resource Information System (HRIS) designed to centralize employee lifecycle management for organizations in Suriname and beyond. It integrates seamlessly with RecruitIQ (ATS) and Paylinq (Payroll), ensuring compliance, scalability, and automation.

#### 1.2 Scope
Nexus will:
- Manage employee master data, contracts, and documents.
- Automate contract extensions and performance reviews via tenant-defined rules.
- Provide leave, attendance, and scheduling management.
- Support Surinamese labor law compliance.
- Integrate with RecruitIQ and Paylinq via APIs.
- Offer multilingual support (Dutch/English).
- Be delivered as a cloud-based SaaS with role-based access control.

#### 1.3 Definitions
- HRIS: Human Resource Information System
- SaaS: Software as a Service
- Tenant: A subscribing company using Nexus
- Rule Engine: Configurable logic layer for contract/review triggers

---

### 2. Overall Description

#### 2.1 Product Perspective
Nexus is the central layer in a 3-part HR tech suite:
- RecruitIQ → Candidate data flows into Nexus upon hiring.
- Nexus → Manages employee lifecycle, contracts, reviews, compliance.
- Paylinq → Payroll and tax processing, fed by Nexus employee data.

#### 2.2 Product Functions
- Employee master data management
- Contract lifecycle management
- Rule-driven contract extensions and reviews
- Leave and attendance tracking
- Document management
- Performance review workflows
- Notifications and reminders
- Reporting and analytics

#### 2.3 User Classes
- HR Admins
- Managers
- Employees
- Executives

#### 2.4 Operating Environment
- Cloud-based (Azure/AWS)
- Web and mobile (iOS/Android)
- Browser support: Chrome, Edge, Safari, Firefox

#### 2.5 Constraints
- Must comply with Surinamese labor law
- Must support Dutch and English
- Must integrate with RecruitIQ and Paylinq
- Must ensure auditability of all HR actions

---

### 3. System Features

#### 3.1 Employee Master Data
- Store personal, job, and contract details
- Maintain version history

#### 3.2 Contract Lifecycle Management
- Support probation, fixed-term, and indefinite contracts
- Allow tenant-defined extension sequences
- Trigger extensions based on review outcomes

#### 3.3 Rule Engine
- Tenants define rules in JSON/YAML
- Rules reference contract type, review scores, attendance
- Rules trigger workflows and notifications

#### 3.4 Performance Reviews
- Configurable templates
- Support probation, annual, and ad-hoc reviews
- 360° feedback
- Review outcomes linked to contract decisions and payroll

#### 3.5 Leave & Attendance
- Leave request/approval workflows
- Holiday calendars
- Attendance tracking

#### 3.6 Document Management
- Secure storage and digital signatures
- Version control and audit logs

#### 3.7 Notifications
- Email, SMS, and in-app alerts
- Configurable reminder schedules

#### 3.8 Reporting & Analytics
- Workforce dashboards
- Review trends
- Compliance reports

---

### 4. External Interfaces

#### 4.1 User Interfaces
- Web portal (responsive)
- Mobile app
- Role-based dashboards

#### 4.2 APIs
- REST/GraphQL APIs
- Webhooks

#### 4.3 Security
- Role-based access control
- SSO (OAuth2, SAML)
- Audit trails
- Data encryption

---

### 5. Non-Functional Requirements
- Performance: 10,000 concurrent users
- Scalability: Multi-tenant SaaS
- Availability: 99.9% uptime SLA
- Security: ISO 27001, GDPR principles
- Localization: Dutch/English
- Auditability: All HR actions logged

---

## 📊 Entity Relationship Diagram (ERD) – PostgreSQL Data Types

### tenant
- id UUID PK
- name VARCHAR(200) NOT NULL
- country_code CHAR(2)
- default_language VARCHAR(5)
- status VARCHAR(20) DEFAULT 'active'
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### user_account
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- email VARCHAR(255) NOT NULL
- password_hash VARCHAR(255)
- first_name VARCHAR(100)
- last_name VARCHAR(100)
- locale VARCHAR(5)
- status VARCHAR(20) DEFAULT 'invited'
- last_login_at TIMESTAMPTZ
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- UNIQUE (tenant_id, email)

### employee
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- user_id UUID FK → user_account.id
- employee_number VARCHAR(50) NOT NULL
- first_name VARCHAR(100) NOT NULL
- last_name VARCHAR(100) NOT NULL
- date_of_birth DATE
- national_id VARCHAR(100)
- email VARCHAR(255)
- phone VARCHAR(50)
- hire_date DATE
- termination_date DATE
- status VARCHAR(20) DEFAULT 'active'
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- UNIQUE (tenant_id, employee_number)

### contract
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- employee_id UUID NOT NULL FK → employee.id
- contract_number VARCHAR(100) NOT NULL
- contract_type VARCHAR(20) NOT NULL
- start_date DATE NOT NULL
- end_date DATE
- probation_end_date DATE
- base_hours_per_week NUMERIC(5,2)
- salary_currency CHAR(3)
- salary_amount NUMERIC(12,2)
- status VARCHAR(30) DEFAULT 'active'
- current_sequence_step INT
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### contract_sequence_policy
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- name VARCHAR(100) NOT NULL
- description TEXT
- is_default BOOLEAN DEFAULT FALSE
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### contract_sequence_step
- id UUID PK
- sequence_policy_id UUID NOT NULL FK → contract_sequence_policy.id
- step_order INT NOT NULL
- duration_months INT
- target_contract_type VARCHAR(20) NOT NULL
- requires_review BOOLEAN DEFAULT TRUE
- min_review_rating NUMERIC(3,2)
- requires_training_completion BOOLEAN DEFAULT FALSE
- requires_attendance_threshold BOOLEAN DEFAULT FALSE
- attendance_threshold_json JSONB
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### review_template
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- name VARCHAR(100) NOT NULL
- review_type VARCHAR(20) NOT NULL
- rating_scale_type VARCHAR(20) NOT NULL
- instructions TEXT
- is_active BOOLEAN DEFAULT TRUE
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### review
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- employee_id UUID NOT NULL FK → employee.id
- review_template_id UUID NOT NULL FK → review_template.id
- reviewer_user_id UUID NOT NULL FK → user_account.id
- review_type VARCHAR(20) NOT NULL
- scheduled_date DATE
- completed_date DATE
- overall_rating NUMERIC(4,2)
- status VARCHAR(20) DEFAULT 'scheduled'
- linked_contract_id UUID FK → contract.id
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### leave_policy
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- name VARCHAR(100) NOT NULL
- leave_type VARCHAR(30) NOT NULL
- accrual_rules_json JSONB
- carryover_rules_json JSONB
- requires_approval BOOLEAN DEFAULT TRUE
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### leave_request
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- employee_id UUID NOT NULL FK → employee.id
- leave_policy_id UUID NOT NULL FK → leave_policy.id
- start_date DATE NOT NULL
- end_date DATE NOT NULL
- reason TEXT
- status VARCHAR(20) DEFAULT 'submitted'
- approver_user_id UUID FK → user_account.id
- decision_at TIMESTAMPTZ
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### attendance_record
- id UUID PK
- tenant_id UUID NOT NULL FK → tenant.id
- employee_id UUID NOT NULL FK → employee.id
- date DATE NOT NULL
- attendance_event_type VARCHAR(20) NOT NULL
- source VARCHAR(20)
- details_json JSONB
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

---

## ✅ Ready to Use
This Markdown file is structured for documentation, GitHub repos