# Phase 2 & 3 Employee Self-Service - QA Testing Guide

## Overview

This guide provides comprehensive testing procedures for the Phase 2 & 3 Employee Self-Service features. QA team should follow these steps to ensure all features work correctly before production deployment.

---

## Test Environment Setup

### Prerequisites

1. **Test Database**
   - Database with migrations applied
   - Test organization created
   - Test employees with various roles

2. **Test Accounts**
   - Employee account (for self-service testing)
   - Manager account (for approval workflows)
   - Admin account (for configuration)

3. **Test Devices**
   - Desktop browser (Chrome, Firefox, Safari, Edge)
   - Mobile browser (iOS Safari, Android Chrome)
   - Various screen sizes

4. **Test Data**
   - Employees with shifts scheduled
   - Employees with paycheck history
   - Various worker types and pay structures

---

## Test Cases

### 1. Time & Attendance - Clock In/Out

#### Test Case 1.1: Successful Clock-In
**Priority:** High  
**Test Steps:**
1. Login as employee
2. Navigate to Employee Home
3. Click "Clock In" button
4. Verify success message displayed
5. Verify button changes to "Clock Out"
6. Check database: `time_attendance_event` table should have new record

**Expected Results:**
- Clock-in successful
- UI updates immediately
- Location captured (if permitted)
- Status shows "Clocked In"

**Test Data:**
- Employee ID: `test_employee_1`
- Organization ID: `test_org_1`

#### Test Case 1.2: Successful Clock-Out
**Priority:** High  
**Test Steps:**
1. Start from clocked-in state (Test Case 1.1)
2. Click "Clock Out" button
3. Verify success message displayed
4. Verify button changes to "Clock In"
5. Check database: `time_entry` table should have calculated entry

**Expected Results:**
- Clock-out successful
- Time entry calculated automatically
- Hours calculated correctly
- Status shows "Clocked Out"

#### Test Case 1.3: Clock Status Persistence
**Priority:** Medium  
**Test Steps:**
1. Clock in as employee
2. Refresh browser page
3. Verify status still shows "Clocked In"
4. Navigate away and back
5. Verify status persists

**Expected Results:**
- Status persists across page refreshes
- Status persists across navigation
- UI reflects accurate state

#### Test Case 1.4: Location Permission Handling
**Priority:** Medium  
**Test Steps:**
1. Block location permissions in browser
2. Click "Clock In"
3. Verify clock-in works without location
4. Allow location permissions
5. Click "Clock In" again (after clock-out)
6. Verify location captured

**Expected Results:**
- Clock-in works with or without location
- Location optional, not required
- No errors when location denied

### 2. Employee Schedule Viewing

#### Test Case 2.1: View Weekly Schedule
**Priority:** High  
**Test Steps:**
1. Login as employee with shifts
2. Navigate to Schedule page
3. Verify current week displayed
4. Verify shifts shown correctly
5. Check shift details (time, location, role)

**Expected Results:**
- Weekly schedule displays
- Shifts show correct dates and times
- Location and role information visible
- Today's date highlighted

**Test Data:**
- Employee with shifts scheduled for current week
- Various shift types and durations

#### Test Case 2.2: Navigate Between Weeks
**Priority:** High  
**Test Steps:**
1. On Schedule page
2. Click "Next Week" button
3. Verify next week's shifts displayed
4. Click "Previous Week" button
5. Verify previous week's shifts displayed
6. Click "Today" button
7. Verify returns to current week

**Expected Results:**
- Navigation works smoothly
- Shifts load for each week
- "Today" button returns to current week
- Week dates update correctly

#### Test Case 2.3: Empty Schedule State
**Priority:** Medium  
**Test Steps:**
1. Login as employee with no shifts
2. Navigate to Schedule page
3. Verify empty state message displayed

**Expected Results:**
- Friendly empty state message
- Suggests day off
- No errors or blank screens

#### Test Case 2.4: Shift Status Indicators
**Priority:** Medium  
**Test Steps:**
1. View schedule with various shift statuses
2. Verify each status has distinct visual indicator
3. Check: scheduled, completed, missed

**Expected Results:**
- Each status has unique color
- Status clearly visible
- Tooltips explain status (if applicable)

### 3. Payroll & Payslips

#### Test Case 3.1: View YTD Summary
**Priority:** High  
**Test Steps:**
1. Login as employee with paycheck history
2. Navigate to Payslips page
3. Verify YTD summary card displays
4. Check gross pay, net pay, taxes, deductions
5. Change year selector
6. Verify summary updates for selected year

**Expected Results:**
- YTD summary displays correctly
- All amounts accurate
- Year selector works
- Data matches database records

**Test Data:**
- Employee with multiple paychecks
- Various years of paycheck history

#### Test Case 3.2: View Payslip List
**Priority:** High  
**Test Steps:**
1. On Payslips page
2. Verify recent payslips listed
3. Check date, period, amounts displayed
4. Verify most recent payslips shown first

**Expected Results:**
- Payslips listed in reverse chronological order
- Correct pay dates and periods
- Gross and net pay amounts visible
- Status indicators shown

#### Test Case 3.3: Download Payslip PDF
**Priority:** High  
**Test Steps:**
1. Click on a payslip card
2. Click "Download" button
3. Verify PDF downloads
4. Open PDF and check content

**Expected Results:**
- PDF downloads successfully
- Filename format: `payslip-{date}.pdf`
- PDF contains correct payslip data
- PDF is readable and formatted

#### Test Case 3.4: Mobile Payslip Viewing
**Priority:** High  
**Test Steps:**
1. Open app on mobile device
2. Navigate to Payslips
3. Verify layout optimized for mobile
4. Tap to expand payslip
5. Verify touch targets are large enough

**Expected Results:**
- Mobile-optimized layout
- Touch targets > 60px
- Readable on small screens
- Smooth animations

### 4. Push Notifications

#### Test Case 4.1: Enable Push Notifications
**Priority:** High  
**Test Steps:**
1. Navigate to Notification Settings
2. Click "Enable Notifications"
3. Grant browser permission
4. Verify subscription successful
5. Check database: `push_notification_subscription` table

**Expected Results:**
- Permission prompt appears
- Subscription saved to backend
- UI shows "Enabled" status
- Device info captured

#### Test Case 4.2: Manage Notification Preferences
**Priority:** High  
**Test Steps:**
1. With notifications enabled
2. Toggle each preference type
3. Verify preferences save
4. Refresh page
5. Verify preferences persisted

**Expected Results:**
- Each toggle works independently
- Preferences save immediately
- Preferences persist across sessions
- Backend updated with each change

**Preference Types:**
- Schedule Reminders
- Payroll Updates
- HR Announcements
- Action Required
- Shift Trades
- Time Off Updates

#### Test Case 4.3: Send Test Notification
**Priority:** High  
**Test Steps:**
1. With notifications enabled
2. Click "Send Test Notification"
3. Verify notification appears
4. Click notification
5. Verify opens app

**Expected Results:**
- Test notification sent successfully
- Notification appears in system tray
- Click opens browser tab
- Notification logged in database

#### Test Case 4.4: Disable Push Notifications
**Priority:** Medium  
**Test Steps:**
1. With notifications enabled
2. Click "Disable Notifications"
3. Verify subscription removed
4. Check database: subscription marked inactive
5. Try sending test notification
6. Verify no notification received

**Expected Results:**
- Subscription removed successfully
- UI shows "Disabled" status
- No notifications received
- Preferences retained for re-enabling

#### Test Case 4.5: Browser Compatibility
**Priority:** High  
**Test Steps:**
1. Test on Chrome
2. Test on Firefox
3. Test on Safari (macOS and iOS)
4. Test on Edge

**Expected Results:**
- Works on Chrome: ✅
- Works on Firefox: ✅
- Works on Safari: ⚠️ (iOS 16.4+ only)
- Works on Edge: ✅

---

## Cross-Browser Testing Matrix

| Feature | Chrome | Firefox | Safari | Edge | iOS Safari | Android Chrome |
|---------|--------|---------|--------|------|------------|----------------|
| Clock In/Out | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Schedule View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Payslips | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PDF Download | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ Full support
- ⚠️ Partial support / Known limitations
- ❌ Not supported

---

## Mobile-Specific Testing

### Touch Interactions
- [ ] All buttons have touch targets ≥ 60px
- [ ] Swipe gestures work (if applicable)
- [ ] No accidental clicks
- [ ] Haptic feedback (if implemented)

### Screen Sizes
- [ ] iPhone SE (320px width)
- [ ] iPhone 12/13 (390px width)
- [ ] iPhone 14 Pro Max (430px width)
- [ ] iPad (768px width)
- [ ] Android phones (various sizes)

### Mobile Features
- [ ] Geolocation works on mobile
- [ ] Camera access works (if needed)
- [ ] Share API works on iOS/Android
- [ ] Add to Home Screen works
- [ ] Offline functionality works

---

## Performance Testing

### Load Time Targets
- [ ] Initial page load < 3s on 4G
- [ ] API responses < 500ms
- [ ] Clock-in/out < 200ms
- [ ] Schedule load < 300ms
- [ ] YTD summary < 500ms

### Network Conditions
Test on:
- [ ] 4G (Good)
- [ ] 3G (Moderate)
- [ ] Slow 3G (Poor)
- [ ] Offline (Service Worker)

---

## Security Testing

### Authentication
- [ ] Endpoints require authentication
- [ ] Clock-in requires employee ID match
- [ ] Cannot view other employees' data
- [ ] Session timeout works
- [ ] CSRF protection enabled

### Data Privacy
- [ ] Employee can only see own data
- [ ] Organization isolation enforced
- [ ] No data leakage in errors
- [ ] Sensitive data not in logs

---

## Accessibility Testing

### WCAG 2.1 Level AA Compliance
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Sufficient color contrast
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Alt text on images

### Testing Tools
- [ ] axe DevTools
- [ ] WAVE browser extension
- [ ] Lighthouse accessibility score > 90

---

## Bug Reporting Template

**Title:** [Feature] Brief description

**Priority:** Critical / High / Medium / Low

**Environment:**
- Browser: Chrome 120.0
- OS: Windows 11
- Mobile: iPhone 14 Pro
- App Version: 1.2.0

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happens

**Screenshots:**
[Attach screenshots]

**Console Errors:**
[Paste any console errors]

**Additional Notes:**
Any other relevant information

---

## Test Sign-Off

**QA Engineer:** _________________  
**Date:** _________________  
**Environment:** Staging / Production  
**Test Results:** Pass / Fail  
**Notes:** _________________

---

## Regression Testing

After any bug fixes or updates, retest:
- [ ] All critical features
- [ ] Previously failing tests
- [ ] Related features
- [ ] Cross-browser compatibility

---

**Document Version:** 1.0  
**Last Updated:** January 1, 2026  
**Next Review:** After each release
