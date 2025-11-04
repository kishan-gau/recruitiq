# Paylinq Localization: Suriname Priority

**Date:** November 4, 2025  
**Status:** Requirements Updated  
**Priority:** MVP focuses on Surinamese payroll legislation

---

## 🎯 Key Change

**Original Assumption:** USA tax rules as primary focus  
**Corrected Focus:** **Suriname** is the primary market for MVP, USA support deferred to Phase 2

---

## 🇸🇷 Surinamese Payroll System Requirements

### Tax Structure

#### 1. Wage Tax (Loonbelasting)
- **Type:** Progressive monthly tax on wages
- **Calculation:** Bracket-based with standard deduction
- **Standard Deduction:** SRD 250 per month
- **Brackets:** Progressive rates from 0% to 38% (exact 2025 rates TBD)

#### 2. Social Security Contributions

**AOV (Algemene Ouderdomsverzekering) - Old Age Pension:**
- Employee contribution: 4%
- Employer contribution: 2%
- Applied to gross salary

**AWW (Algemene Weduwen en Wezenverzekering) - Widow/Orphan Insurance:**
- Contribution rates to be configured
- Applied to gross salary

#### 3. Worker Classifications
- **Salaried employees** - Monthly fixed salary
- **Hourly/daily workers** - Time-based calculation
- **Contract workers** - Simplified tax treatment
- **Government vs. private sector** - May have different rules

### Currency & Payments

**Primary Currency:** Surinamese Dollar (SRD)  
**Secondary Currency:** USD (common in certain industries)

**Local Banks:**
- DSB Bank
- Hakrinbank
- RBC (Royal Bank of Canada Suriname)
- FINA Bank
- Finabank

### Compliance & Reporting

1. **Monthly:** Tax declarations to Surinamese Tax Authority
2. **Monthly:** Social security (AOV/AWW) reporting
3. **Annual:** Employee income statements
4. **Ongoing:** Minimum wage compliance

### Common Payroll Practices

- **13th Month Bonus** - Extra month salary at year-end (common)
- **Vacation Allowance** - Additional payment for vacation
- **Overtime:** Typically 1.5x after 8 hours/day
- **Weekend/Holiday Premium:** Enhanced rates for special days

---

## 📋 MVP Implementation Priorities

### Tax Rules Module
✅ **Include in MVP:**
- Suriname Wage Tax (Loonbelasting) configuration
- Progressive tax brackets (SRD-based)
- Standard deduction (SRD 250)
- AOV contribution calculation (4% employee, 2% employer)
- AWW contribution calculation

❌ **Defer to Phase 2:**
- USA federal/state tax rules
- W-4 form processing
- FICA calculations
- Multi-jurisdictional tax (other countries)

### Workers Management
✅ **Include in MVP:**
- Surinamese National ID field
- SRD currency as primary
- USD as secondary option
- Local bank account configuration (Surinamese banks)
- AOV/AWW enrollment status

### Payment Processing
✅ **Include in MVP:**
- SRD payment calculations
- USD payment option
- Manual bank file generation (CSV/Excel for local banks)
- 13th-month bonus handling
- Vacation allowance tracking

❌ **Defer to Phase 2:**
- Direct bank API integration (DSB, Hakrinbank)
- ACH/Wire transfers
- International payments (SWIFT/IBAN)

### Reports
✅ **Include in MVP:**
- Monthly tax summary (Suriname format)
- AOV/AWW contribution reports
- Employee payslips (Surinamese format)
- Payroll cost analysis in SRD

---

## 🔧 Technical Implementation Changes

### Database Schema
- Add `currency` field to worker compensation (SRD/USD)
- Add `national_id` field for Surinamese ID
- Tax rule sets include `country` field (default: 'Suriname')
- Tax types include: 'wage_tax', 'aov', 'aww'

### API Endpoints
```typescript
// Tax calculation endpoint
POST /api/payroll/calculate-suriname-tax
{
  grossIncome: number;      // in SRD
  standardDeduction: number; // SRD 250 default
  dependents: number;
  aovApplicable: boolean;
  awwApplicable: boolean;
}

// Returns
{
  wageTax: number;
  aovEmployee: number;
  aovEmployer: number;
  aww: number;
  netPay: number;
}
```

### UI Components
- Currency selector (SRD/USD) in worker forms
- Surinamese bank dropdown (DSB, Hakrinbank, RBC, etc.)
- Tax summary cards showing AOV/AWW separately
- Payslip template with Surinamese format

---

## 📊 Mock Data for Development

### Sample Surinamese Worker
```typescript
{
  employeeNumber: "SR-2025-001",
  fullName: "John Doe",
  nationalId: "1234567890", // Surinamese ID
  email: "john.doe@company.sr",
  workerType: "Full-Time Salaried",
  compensation: {
    type: "salary",
    amount: 5000, // SRD per month
    currency: "SRD",
    payFrequency: "monthly"
  },
  bankInfo: {
    bankName: "DSB Bank",
    accountNumber: "1234567",
    accountType: "savings",
    currency: "SRD"
  },
  taxInfo: {
    nationalId: "1234567890",
    standardDeduction: 250, // SRD
    dependents: 2,
    aovEnrolled: true,
    awwEnrolled: true
  }
}
```

### Sample Tax Calculation
```typescript
// Monthly salary: SRD 5,000
// Standard deduction: SRD 250
// Taxable income: SRD 4,750

// Tax calculation (placeholder rates):
// First SRD 1,500: 0% = SRD 0
// Next SRD 1,500 (1,501-3,000): 8% = SRD 120
// Next SRD 1,750 (3,001-4,750): 18% = SRD 315
// Total wage tax: SRD 435

// Social security:
// AOV employee (4%): SRD 200
// AOV employer (2%): SRD 100
// AWW: [TBD]

// Net pay: SRD 5,000 - 435 - 200 = SRD 4,365
```

---

## ✅ Action Items

### Immediate (Before Building Components)
- [ ] Obtain official 2025 Surinamese tax brackets
- [ ] Confirm current AOV/AWW rates
- [ ] Get list of Surinamese public holidays
- [ ] Research minimum wage requirements
- [ ] Confirm standard working hours regulations

### Development Phase
- [ ] Create Surinamese tax calculation service
- [ ] Build SRD currency formatter
- [ ] Design Surinamese payslip template
- [ ] Implement AOV/AWW calculation logic
- [ ] Create bank file export (CSV format for local banks)

### Future Enhancements (Phase 2)
- [ ] USA tax rules (federal/state)
- [ ] Netherlands tax rules
- [ ] Other Caribbean nations
- [ ] Direct bank API integration
- [ ] Multi-currency exchange rate tracking

---

## 🌍 Phase 2 Expansion Markets

Once Suriname MVP is stable, expand to:
1. **USA** - Federal and state tax rules
2. **Netherlands** - For Dutch Caribbean connections
3. **Caribbean Region** - Aruba, Curaçao, Trinidad & Tobago, etc.
4. **Europe** - For international companies with Surinamese operations

---

**Document Owner:** Paylinq Product Team  
**Review Date:** Every 6 months or when Surinamese tax law changes  
**Compliance:** Must align with Surinamese Ministry of Finance regulations
