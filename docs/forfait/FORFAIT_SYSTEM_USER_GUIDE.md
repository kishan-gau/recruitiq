# Forfait System User Guide

**For:** PayLinQ Application Users  
**Version:** 1.0  
**Last Updated:** December 8, 2025

---

## Table of Contents

1. [What is the Forfait System?](#what-is-the-forfait-system)
2. [Getting Started](#getting-started)
3. [Managing Forfait Rules](#managing-forfait-rules)
4. [Employee Benefit Assignments](#employee-benefit-assignments)
5. [Payroll Integration](#payroll-integration)
6. [Common Scenarios](#common-scenarios)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## What is the Forfait System?

The **Forfait System** in PayLinQ helps you manage **taxable employee benefits** according to **Dutch tax law** (Wet Loonbelasting). It automatically calculates taxes on benefits like company cars, housing allowances, meal benefits, and medical coverage.

### Why Use Forfait Benefits?

✅ **Tax Compliance** - Follows Dutch tax law requirements  
✅ **Automatic Calculations** - No manual benefit tax calculations  
✅ **Payroll Integration** - Benefits appear automatically in payroll  
✅ **Employee Tracking** - Track all benefits per employee  
✅ **Audit Ready** - Complete records for tax authorities

### Common Benefit Types

| Benefit Type | Tax Rate | Example |
|-------------|----------|---------|
| **Company Car** | 2% or 3% monthly | 2% of SRD 50,000 car = SRD 1,000/month |
| **Housing Benefit** | 7.5% annually | 7.5% of SRD 60,000 rent = SRD 4,500/year |
| **Meal Benefits** | Fixed rates | Hot meals: SRD 15 per meal |
| **Medical Coverage** | Progressive rates | Based on coverage value |

---

## Getting Started

### Step 1: Access the Forfait System

1. **Log into PayLinQ** as Administrator or HR Manager
2. **Navigate to:** Payroll → Forfait Benefits
3. **You'll see three main sections:**
   - 📋 **Forfait Rules** - Configure benefit calculation rules
   - 👥 **Employee Assignments** - Assign benefits to employees
   - 📊 **Reports** - View benefit summaries and calculations

### Step 2: Understand Your Role Permissions

| Role | Can View | Can Configure | Can Assign | Can Override |
|------|----------|---------------|------------|-------------|
| **Administrator** | ✅ All | ✅ All rules | ✅ All employees | ✅ All benefits |
| **HR Manager** | ✅ All | ✅ Non-admin rules | ✅ All employees | ✅ Department benefits |
| **Manager** | ✅ Department only | ❌ No | ✅ Team members | ✅ Team benefits |
| **Payroll Clerk** | ✅ All | ❌ No | ✅ All employees | ❌ No |

### Step 3: Review Existing Setup

Before making changes, check what's already configured:

1. **Go to Forfait Rules** to see active benefit rules
2. **Check Employee Assignments** to see who has benefits
3. **Review Recent Payrolls** to see how benefits are currently calculated

---

## Managing Forfait Rules

### Understanding Forfait Rules

A **Forfait Rule** defines how a specific benefit is calculated and taxed. Each rule includes:

- **Rule Code:** Unique identifier (e.g., "COMPANY_CAR_2PCT")
- **Benefit Type:** Car, housing, meal, medical, etc.
- **Calculation Method:** How the taxable amount is calculated
- **Tax Rate:** Percentage applied to the benefit value
- **Auto-Assignment:** Whether to automatically assign to eligible employees

### Creating a Company Car Rule

#### Step 1: Set Up Basic Rule

1. **Click "Add New Forfait Rule"**
2. **Fill in basic information:**
   - **Rule Name:** "Company Car Benefit (2%)"
   - **Rule Code:** "COMPANY_CAR_2PCT"  
   - **Benefit Type:** Select "Company Car"
   - **Description:** "Standard company car benefit - 2% of catalog value per month"

#### Step 2: Configure Calculation

1. **Select Calculation Type:** "Percentage of Catalog Value"
2. **Set Tax Rate:** 2.00% (standard Dutch rate)
3. **Configure Value Mapping:**
   ```
   Catalog Value: Get from Employee → Car → Catalog Value
   Fuel Type: Get from Employee → Car → Fuel Type (default: gasoline)
   ```

#### Step 3: Set Auto-Assignment Rules

1. **Enable Auto-Assignment:** ✅ Yes
2. **Set Eligibility Criteria:**
   - Employee Status: Active
   - Job Levels: Manager, Director, Executive
   - Minimum Salary: SRD 50,000
3. **Effective Date:** Immediate (or specify date)

#### Step 4: Preview and Save

1. **Click "Preview Calculation"** to test with sample values
2. **Review the rule summary**
3. **Click "Save and Apply"**

The system will automatically:
- ✅ Create the forfait rule
- ✅ Find eligible employees  
- ✅ Create benefit assignments
- ✅ Send notifications to affected employees

### Using Predefined Templates

PayLinQ includes **Dutch tax compliant templates** for common benefits:

#### Available Templates

1. **Company Car Templates:**
   - Standard Car (2% rate)
   - Luxury Car (3% rate)
   - Electric Vehicle (1.5% rate)

2. **Housing Benefit Templates:**
   - Standard Housing (7.5% of rental value)
   - Company Housing (Fixed monthly amount)

3. **Medical Benefit Templates:**
   - Basic Medical (Progressive rates)
   - Premium Medical (Higher coverage)

4. **Meal Benefit Templates:**
   - Hot Meal Forfait (Fixed per meal)
   - Meal Vouchers (Percentage of value)

#### Using a Template

1. **Go to Forfait Rules → Templates**
2. **Select desired template** (e.g., "Standard Car 2%")
3. **Click "Use This Template"**
4. **Customize if needed:**
   - Change rule name/code
   - Modify eligibility criteria
   - Adjust auto-assignment settings
5. **Save and apply**

### Modifying Existing Rules

⚠️ **Important:** Changing forfait rules affects employee payroll. Always:

1. **Review Impact:** Check how many employees will be affected
2. **Set Effective Date:** Use future date to avoid retroactive changes
3. **Notify Employees:** Inform affected employees before changes take effect
4. **Backup Data:** Export current assignments before major changes

#### How to Modify a Rule

1. **Find the rule** in Forfait Rules list
2. **Click "Edit"** next to the rule name
3. **Make necessary changes**
4. **Set new effective date** (recommended: next payroll period)
5. **Review preview** showing affected employees
6. **Save changes**

---

## Employee Benefit Assignments

### Viewing Employee Benefits

#### For Individual Employees

1. **Go to Employees** in PayLinQ
2. **Find the employee** and click their name
3. **Go to Benefits tab**
4. **View current forfait assignments:**
   - Active benefits with amounts
   - Effective dates
   - Override amounts (if any)
   - Calculation details

#### For All Employees

1. **Go to Forfait Benefits → Employee Assignments**
2. **Use filters to narrow down:**
   - Department
   - Benefit type
   - Effective date range
   - Assignment status
3. **Export to Excel** for detailed analysis

### Manually Assigning Benefits

Sometimes you need to assign benefits that don't qualify for auto-assignment:

#### Step 1: Select Employee and Benefit

1. **Go to Employee Assignments → Add Assignment**
2. **Select Employee:** Choose from dropdown
3. **Select Benefit Component:** Choose available forfait component
4. **Set Effective Dates:** Start date (required), End date (optional)

#### Step 2: Configure Benefit Details

1. **Provide Required Values:**
   - For car benefits: Catalog value, fuel type
   - For housing: Monthly rent, property type
   - For medical: Coverage amount
2. **Set Override Amount (optional):** Fixed amount instead of calculated
3. **Add Notes:** Reason for assignment, special circumstances

#### Step 3: Preview and Confirm

1. **Click "Preview Calculation"** to see taxable amount
2. **Review assignment summary**
3. **Click "Create Assignment"**

The benefit will appear in the employee's next payroll calculation.

### Employee Benefit Overrides

Sometimes standard calculations don't fit specific situations. You can override:

#### Amount Override
Replace calculated amount with fixed amount.

**Example:** Standard car benefit calculates to SRD 1,200, but you want SRD 1,000.

1. **Find employee assignment**
2. **Click "Override Amount"**
3. **Enter SRD 1,000**
4. **Add reason:** "Negotiated reduced rate"
5. **Save override**

#### Formula Override  
Use custom calculation for this employee only.

**Example:** Housing benefit based on 50% of rent instead of standard 7.5%.

1. **Find employee assignment**
2. **Click "Override Formula"** 
3. **Enter formula:** `monthly_rent * 0.50`
4. **Add reason:** "Executive housing package"
5. **Save override**

### Removing Benefit Assignments

When employees no longer qualify for benefits:

1. **Find the assignment** in Employee Assignments
2. **Click "Remove" or "End Assignment"**
3. **Choose end method:**
   - **End Immediately:** Benefit stops now
   - **End at Period:** Benefit stops at end of current period
   - **End on Date:** Benefit stops on specific date
4. **Add reason for removal**
5. **Confirm removal**

⚠️ **Note:** Ended assignments remain visible for audit purposes but don't affect payroll.

---

## Payroll Integration

### How Forfait Benefits Appear in Payroll

Forfait benefits automatically integrate with PayLinQ payroll calculations:

#### Payroll Run Process

1. **Calculate Base Salary:** Regular salary calculation
2. **Add Forfait Benefits:** System automatically:
   - Finds active benefit assignments
   - Calculates taxable amounts  
   - Applies employee overrides
   - Adds to taxable income
3. **Calculate Taxes:** Total taxable income including benefits
4. **Generate Payslip:** Benefits shown separately on payslip

#### Payslip Display

Benefits appear on employee payslips as:

```
EARNINGS
Base Salary                    SRD 8,000.00
Overtime                       SRD   500.00
                              -----------
Subtotal                      SRD 8,500.00

TAXABLE BENEFITS (FORFAIT)
Company Car Benefit            SRD 1,000.00
Housing Benefit                SRD   375.00
Medical Coverage               SRD   150.00
                              -----------
Benefits Subtotal             SRD 1,525.00

GROSS TAXABLE INCOME          SRD 10,025.00
```

### Reviewing Benefit Calculations

#### Before Payroll Processing

1. **Go to Payroll → Preview Run**
2. **Review Forfait Summary:**
   - Total employees with benefits
   - Total benefit amounts
   - Benefit breakdown by type
3. **Check Individual Calculations:**
   - Click employee name to see benefit details
   - Verify calculations are correct
   - Review any error messages

#### During Payroll Run

The system automatically:
- ✅ Fetches all active benefit assignments
- ✅ Calculates amounts using current values  
- ✅ Applies any employee overrides
- ✅ Validates calculations for accuracy
- ✅ Includes benefits in tax calculations

#### After Payroll Processing

1. **Review Payroll Reports:**
   - Forfait Benefits Summary
   - Employee Benefit Details
   - Tax Impact Analysis
2. **Check for Issues:**
   - Missing benefit calculations
   - Incorrect amounts
   - Employee complaints
3. **Export Data:** For accounting and tax filing

### Handling Payroll Corrections

If you discover benefit calculation errors after payroll:

#### For Current Period
1. **Stop payroll processing** if still in progress
2. **Correct the issue:**
   - Fix forfait rule
   - Update employee assignment
   - Adjust override amount
3. **Re-run payroll calculation**
4. **Verify corrections** before finalizing

#### For Previous Periods
1. **Document the error** with screenshots
2. **Calculate correction amount**
3. **Create adjustment** in next payroll:
   - Add correction as separate line item
   - Include explanation in notes
4. **Update employee records** for future accuracy
5. **Notify affected employees** of correction

---

## Common Scenarios

### Scenario 1: New Employee with Company Car

**Situation:** New manager joins with company car benefit.

**Steps:**
1. **Add Employee** to PayLinQ system
2. **Add Car Details** to employee profile:
   - Catalog value: SRD 45,000
   - Fuel type: Gasoline
   - Registration date
3. **Benefit Auto-Assignment** (if rule configured):
   - System automatically assigns car benefit
   - Calculation: SRD 45,000 × 2% = SRD 900/month
4. **Verify Assignment** in employee benefits
5. **Next Payroll** will include SRD 900 taxable benefit

### Scenario 2: Employee Promotion with Housing Benefit

**Situation:** Employee promoted to director, now eligible for housing benefit.

**Steps:**
1. **Update Employee Record:**
   - Change job title to Director
   - Update salary to new amount
2. **Add Housing Details:**
   - Monthly rent: SRD 5,000
   - Property type: House
3. **Manual Assignment** (if not auto-assigned):
   - Go to Employee Assignments
   - Add housing benefit assignment
   - Effective from promotion date
4. **Calculation:** SRD 5,000 × 12 months × 7.5% ÷ 12 = SRD 375/month

### Scenario 3: Temporary Benefit Reduction

**Situation:** Economic downturn requires temporary 50% reduction in all car benefits.

**Options:**

#### Option A: Modify Rule (affects all employees)
1. **Edit Company Car Rule**
2. **Change rate from 2% to 1%**
3. **Set effective date** (e.g., next month)
4. **All employees automatically updated**

#### Option B: Individual Overrides (case-by-case)
1. **For each employee with car benefit:**
2. **Add amount override** at 50% of current amount
3. **Add note:** "Temporary reduction - economic conditions"
4. **Set end date** when reduction expires

### Scenario 4: Benefit Calculation Dispute

**Situation:** Employee questions their housing benefit calculation.

**Investigation Steps:**
1. **Review Employee Assignment:**
   - Benefit component: Housing Forfait 7.5%
   - Effective dates: When started
   - Configuration values: Monthly rent amount
2. **Check Calculation:**
   - Formula: (monthly_rent × 12 × 0.075) ÷ 12
   - Values: Rent SRD 4,500 → Benefit SRD 337.50/month
3. **Verify Override Status:**
   - Any manual overrides applied?
   - Override reason and date
4. **Provide Documentation:**
   - Show calculation breakdown
   - Explain Dutch tax law requirements
   - Reference forfait rule configuration

### Scenario 5: Mid-Year Benefit Changes

**Situation:** Employee car upgrade mid-year from SRD 35,000 to SRD 55,000 vehicle.

**Steps:**
1. **End Current Assignment:**
   - Set end date to car change date
   - Reason: "Vehicle upgrade"
2. **Create New Assignment:**
   - Start date: Car change date + 1 day
   - New catalog value: SRD 55,000
   - Same benefit rule (2%)
3. **Payroll Impact:**
   - Old benefit: SRD 35,000 × 2% = SRD 700/month
   - New benefit: SRD 55,000 × 2% = SRD 1,100/month
   - Prorated for partial months

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: "Forfait rule not found" Error

**Symptoms:**
- Error message when viewing employee benefits
- Benefit shows in assignment but not in payroll
- Assignment appears inactive

**Cause:** Forfait rule was deleted or deactivated

**Solution:**
1. **Check Forfait Rules list** for missing/inactive rules
2. **Reactivate rule** if accidentally deactivated
3. **Recreate rule** if deleted (use same rule code)
4. **Reassign benefits** to affected employees

#### Issue 2: Benefit Amount Shows as SRD 0.00

**Symptoms:**
- Employee has active benefit assignment
- Payroll shows SRD 0.00 for benefit
- No error messages

**Possible Causes & Solutions:**

**Missing Configuration Values:**
- Check employee profile has required benefit data
- Car benefits need catalog value
- Housing benefits need rental amount

**Incorrect Formula:**
- Review forfait rule calculation settings
- Test with "Preview Calculation" feature
- Check for syntax errors in custom formulas

**Date Issues:**
- Verify assignment effective date is not future
- Check assignment hasn't expired
- Confirm payroll date range includes assignment

**Override Problems:**
- Look for zero-value overrides
- Check override formulas for errors
- Verify override hasn't been accidentally applied

#### Issue 3: Auto-Assignment Not Working

**Symptoms:**
- New employees don't get automatic benefit assignments
- Rule is active but no assignments created
- Manual assignment required for all employees

**Diagnosis Steps:**
1. **Check Rule Configuration:**
   - Auto-assignment enabled?
   - Eligibility criteria too restrictive?
2. **Review Employee Data:**
   - Do employees meet eligibility criteria?
   - Required fields populated?
3. **Check System Logs:**
   - Any error messages during auto-assignment?
   - Processing failures?

**Solutions:**
- Relax eligibility criteria if too restrictive
- Add missing employee data required for assignments
- Run manual auto-assignment process for affected employees

#### Issue 4: Benefit Shows Wrong Amount

**Symptoms:**
- Calculated amount doesn't match expected
- Amount changes unexpectedly between payrolls
- Different amount than preview calculation

**Diagnosis:**
1. **Review Calculation Chain:**
   - Employee override amount?
   - Employee override formula?
   - Component formula?
   - Default amount?
2. **Check Variable Values:**
   - Catalog value, rent amount, etc.
   - Values changed since last payroll?
3. **Verify Rule Settings:**
   - Tax rate correct?
   - Calculation type appropriate?

#### Issue 5: Employee Cannot See Their Benefits

**Symptoms:**
- Employee reports benefits not showing in self-service
- Benefits visible to HR but not employee
- Permission errors

**Solutions:**
1. **Check User Permissions:**
   - Employee role has benefit viewing rights?
   - Organization access configured?
2. **Verify Assignment Status:**
   - Assignment is active?
   - Within effective date range?
3. **Check System Configuration:**
   - Self-service module enabled for benefits?
   - Employee portal properly configured?

### Performance Issues

#### Slow Benefit Calculations

**Symptoms:**
- Payroll processing takes longer than usual
- Timeout errors during benefit calculation
- System becomes unresponsive

**Solutions:**
1. **Review Complex Formulas:**
   - Simplify overly complex custom formulas
   - Use more efficient calculation methods
2. **Optimize Database:**
   - Check for missing database indexes
   - Clean up old assignment data
3. **Batch Processing:**
   - Process benefits in smaller batches
   - Stagger payroll calculations

#### Large Data Volume

For organizations with 1000+ employees:

1. **Use Filtering:**
   - Process by department
   - Separate active/inactive employees
2. **Schedule Processing:**
   - Run calculations during off-hours
   - Use automated batch jobs
3. **Monitor Resources:**
   - Check system memory usage
   - Verify adequate processing capacity

### Getting Additional Help

#### In-Application Help

1. **Click "?" icons** next to form fields for field-specific help
2. **Use "Help" menu** for system documentation
3. **Access Video Tutorials** from the help center

#### Contacting Support

When contacting PayLinQ support, provide:

1. **Your Organization Details:**
   - Organization name and ID
   - PayLinQ version number
   - User role and permissions

2. **Problem Description:**
   - What you were trying to do
   - What happened vs. what you expected
   - Error messages (exact text)
   - Screenshots if helpful

3. **Employee/Benefit Details:**
   - Employee ID (if applicable)
   - Benefit type and rule code
   - Date/payroll period affected

4. **Steps Taken:**
   - What troubleshooting you've already tried
   - Recent changes that might be related

#### Best Practices for Support

- ✅ **Be Specific:** "Car benefit shows SRD 0" vs. "benefits not working"
- ✅ **Include Context:** "Started after we updated car values yesterday"
- ✅ **Provide Examples:** "Employee ID 12345 shows this issue"
- ✅ **Try Basic Solutions First:** Check rule status, assignment dates, etc.

---

**Need More Help?**

📧 **Email Support:** paylinq-support@recruitiq.com  
📞 **Phone Support:** Available during business hours  
💬 **Live Chat:** Available in PayLinQ application  
📚 **Documentation:** Complete user guides at docs.recruitiq.com/paylinq

---

**Last Updated:** December 8, 2025  
**User Guide Version:** 1.0  
**PayLinQ Version:** v2.x