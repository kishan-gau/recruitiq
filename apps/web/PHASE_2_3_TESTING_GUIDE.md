# Phase 2 & 3 Testing Guide

This guide provides comprehensive instructions for testing all Phase 2 and Phase 3 features implemented in the PWA.

---

## Prerequisites

### Development Environment
```bash
# Navigate to web app
cd apps/web

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at: `http://localhost:5177`

### Testing on Mobile Devices

#### Option 1: Local Network (Recommended for testing)
1. Find your computer's local IP address
2. Ensure your mobile device is on the same network
3. Access: `http://YOUR_IP:5177`

#### Option 2: Browser DevTools
1. Open Chrome DevTools (F12)
2. Click the device toolbar icon (Ctrl+Shift+M)
3. Select a mobile device profile
4. Test responsive features

---

## Phase 2: Employee Features Testing

### 1. Employee Home Page

**Route:** `/employee`

**Test Checklist:**
- [ ] Welcome message displays with user's first name
- [ ] Current date displays correctly
- [ ] Quick Clock-In widget is visible
- [ ] 4 quick action cards display:
  - [ ] Schedule
  - [ ] Payslips
  - [ ] Time Off
  - [ ] Profile
- [ ] Touch targets are at least 60px (use inspector)
- [ ] All navigation links work

**Visual Check:**
- Header has gradient background
- Cards have hover/active states
- Icons render correctly
- Layout is centered and readable

---

### 2. Quick Clock-In Widget

**Location:** Employee Home Page

**Test Checklist:**
- [ ] Current time displays and updates every second
- [ ] Clock button is at least 80px tall
- [ ] Button changes color based on state:
  - [ ] Blue when clocked out
  - [ ] Red when clocked in
- [ ] Location displays (e.g., "Main Office")
- [ ] Status indicator shows correct state
- [ ] Success animation plays on action
- [ ] Button has active/pressed state on touch

**Functional Tests:**
1. Click "Clock In" button
   - [ ] Button shows "Processing..."
   - [ ] After 1 second, changes to "Clock Out"
   - [ ] Success checkmark appears briefly
   - [ ] Status changes to "Clocked In"
   - [ ] Clock-in time displays

2. Click "Clock Out" button
   - [ ] Reverses to "Clock In" state
   - [ ] Status changes to "Not Clocked In"

**Edge Cases:**
- [ ] Rapid clicking doesn't cause issues
- [ ] Button is disabled during processing

---

### 3. Employee Schedule Page

**Route:** `/employee/schedule`

**Test Checklist:**
- [ ] Weekly navigation displays current week
- [ ] Day selector pills show 7 days (Sun-Sat)
- [ ] Today's date is highlighted
- [ ] Selected date shows in different color
- [ ] Week navigation arrows work:
  - [ ] Previous week button
  - [ ] Next week button
  - [ ] "Today" button resets to current week

**Schedule Display:**
- [ ] Shift cards show:
  - [ ] Start and end time
  - [ ] Duration
  - [ ] Location
  - [ ] Role
  - [ ] Status badge
- [ ] Empty state shows when no shifts
- [ ] Cards are touch-friendly

**Actions:**
- [ ] "Request Time Off" button navigates
- [ ] "View Full Calendar" button navigates
- [ ] Day pills are scrollable horizontally on mobile

---

### 4. Employee Payslips Page

**Route:** `/employee/pay`

**Test Checklist:**
- [ ] YTD summary card displays:
  - [ ] Gross Pay
  - [ ] Net Pay
  - [ ] Taxes
  - [ ] Deductions
  - [ ] Year selector dropdown
- [ ] Payslip list displays recent payslips
- [ ] Each payslip card shows:
  - [ ] Date
  - [ ] Period
  - [ ] Net pay (green, prominent)
  - [ ] Gross pay
  - [ ] Chevron icon

**Expandable Cards:**
1. Click on a payslip card
   - [ ] Card expands
   - [ ] Three action buttons appear:
     - [ ] View (eye icon)
     - [ ] Download (download icon)
     - [ ] Share (share icon)
   - [ ] Chevron rotates 90°
   
2. Click again to collapse
   - [ ] Actions hide
   - [ ] Card returns to compact state

**Tax Documents:**
- [ ] Section displays W-2 forms
- [ ] Available forms have "Download" button
- [ ] Unavailable forms show "Available in YEAR" text

---

### 5. Employee Time Off Page

**Route:** `/employee/time-off`

**Test Checklist:**
- [ ] Leave balance cards display:
  - [ ] Vacation balance
  - [ ] Sick leave balance
  - [ ] Personal days balance
  - [ ] Progress bars show utilization
- [ ] "Request Time Off" button opens modal
- [ ] Request history shows past requests
- [ ] Each request card shows:
  - [ ] Type
  - [ ] Dates
  - [ ] Duration
  - [ ] Status badge (color-coded)
  - [ ] Denial reason (if applicable)

**Request Form Modal:**
1. Click "Request Time Off"
   - [ ] Modal slides up from bottom (mobile)
   - [ ] Form displays:
     - [ ] Leave type dropdown
     - [ ] Start date picker
     - [ ] End date picker
     - [ ] Reason textarea (optional)
     - [ ] Submit button

2. Fill out form
   - [ ] End date cannot be before start date
   - [ ] Form validates required fields
   - [ ] Submit button is touch-friendly

3. Click X or backdrop
   - [ ] Modal closes
   - [ ] Form resets

---

### 6. Employee Profile Page

**Route:** `/employee/profile`

**Test Checklist:**
- [ ] Profile header displays:
  - [ ] User name
  - [ ] Email
  - [ ] Profile photo or placeholder
  - [ ] Edit button
- [ ] Profile photo has camera icon in edit mode

**Sections:**
1. **Personal Information**
   - [ ] Email field
   - [ ] Phone field
   - [ ] Address field
   - [ ] Date of birth field
   - [ ] All fields show current data
   - [ ] In edit mode, fields become editable

2. **Emergency Contacts**
   - [ ] Contact cards display
   - [ ] Each card shows:
     - [ ] Name
     - [ ] Relationship
     - [ ] Phone number
     - [ ] Edit button (in edit mode)
   - [ ] "Add Emergency Contact" button displays

3. **Settings**
   - [ ] Notifications setting links to settings page
   - [ ] Security setting shows (future implementation)
   - [ ] Each row has chevron icon

4. **Sign Out**
   - [ ] Red button at bottom
   - [ ] Confirmation before logout (future)

**Edit Mode:**
1. Click "Edit" button
   - [ ] Button changes to "Cancel"
   - [ ] Input fields become editable
   - [ ] Camera icon appears on profile photo
   - [ ] Emergency contact "Edit" buttons appear

2. Click "Cancel"
   - [ ] Returns to view mode
   - [ ] Changes are discarded

---

## Phase 3: Advanced Features Testing

### 7. Offline Functionality

**Test Setup:**
1. Open app in Chrome DevTools
2. Go to Network tab
3. Check "Offline" checkbox

**Tests:**
- [ ] Offline indicator banner appears (yellow)
- [ ] Banner says "You are offline"
- [ ] App continues to function
- [ ] Previously loaded data still displays

**Reconnection:**
1. Uncheck "Offline"
2. [ ] Banner changes to green "Back online"
3. [ ] Shows "Syncing..." with spinner
4. [ ] After 3 seconds, banner disappears
5. [ ] Console logs show sync activity

**IndexedDB Storage:**
1. Open Chrome DevTools > Application tab
2. Navigate to IndexedDB > RecruitIQ_OfflineDB
3. [ ] Three stores exist:
   - [ ] payslips
   - [ ] schedules
   - [ ] offlineQueue

---

### 8. Push Notifications

**Route:** `/employee/settings/notifications`

**Test Checklist:**
- [ ] Page detects if notifications are supported
- [ ] Permission status displays correctly:
  - [ ] "Enabled" (green) if granted
  - [ ] "Disabled" (gray) if default
  - [ ] "Blocked" (red) if denied
- [ ] Enable/Disable button shows

**Enable Flow:**
1. Click "Enable Notifications"
   - [ ] Browser prompts for permission
   - [ ] Button shows "Processing..."
   
2. Click "Allow" in browser prompt
   - [ ] Status changes to "Enabled"
   - [ ] Button changes to "Disable Notifications"
   - [ ] Notification type toggles appear

**Notification Types:**
- [ ] Schedule Reminders toggle
- [ ] Payroll Updates toggle
- [ ] HR Announcements toggle
- [ ] Action Required toggle
- [ ] Each toggle saves preference to localStorage

**Disable Flow:**
1. Click "Disable Notifications"
   - [ ] Unsubscribes from push
   - [ ] Status changes to "Disabled"
   - [ ] Type toggles hide

**Blocked State:**
- [ ] Shows red alert message
- [ ] Explains how to re-enable in browser settings
- [ ] No enable button (can't override browser)

---

### 9. Performance Monitoring

**Console Logs:**
1. Open browser console
2. Refresh the page
3. [ ] Look for `[Web Vitals]` logs:
   - [ ] LCP (Largest Contentful Paint)
   - [ ] FID (First Input Delay)
   - [ ] CLS (Cumulative Layout Shift)
   - [ ] FCP (First Contentful Paint)
   - [ ] TTFB (Time to First Byte)

**Targets:**
- LCP: < 2.5s (Good), < 4.0s (Needs Improvement)
- FID: < 100ms (Good), < 300ms (Needs Improvement)
- CLS: < 0.1 (Good), < 0.25 (Needs Improvement)

**Bundle Size:**
- [ ] Check build output for bundle sizes
- [ ] Main bundle should be < 500 KB
- [ ] Individual route chunks < 50 KB each

---

### 10. Pull-to-Refresh

**Test on Touch Device (or DevTools with touch emulation):**

1. Scroll to top of any page
2. Pull down with touch gesture
3. [ ] Visual indicator appears at top
4. [ ] Circular refresh icon rotates as you pull
5. [ ] Color changes when threshold is reached
6. [ ] Release when icon is blue/highlighted
7. [ ] Shows spinning loader
8. [ ] Page refreshes data
9. [ ] Indicator disappears

**Edge Cases:**
- [ ] Only works when scrolled to top
- [ ] Doesn't interfere with normal scrolling
- [ ] Works on all employee pages

---

## Mobile-First Design Validation

### Touch Targets
Use browser inspector to measure:
- [ ] All buttons are at least 60x60px
- [ ] Clock-in button is 80px tall
- [ ] Bottom navigation icons are 56px tall
- [ ] Card touch areas are adequately sized

### Safe Areas (iPhone X and newer)
- [ ] Content doesn't hide behind notch
- [ ] Bottom navigation respects safe area inset
- [ ] Full-screen modals account for notch

### Gestures
- [ ] Swipe left/right on schedule day picker
- [ ] Pull-to-refresh works smoothly
- [ ] Modal slides up from bottom
- [ ] No 300ms click delay (touch-manipulation CSS)

### Typography
- [ ] Minimum font size is 16px
- [ ] Line height is 1.5x
- [ ] Text is readable on all screen sizes

---

## Browser Compatibility Testing

### Desktop Browsers
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Employee Portal | ✅ | ✅ | ✅ | ✅ |
| Offline Storage | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ⚠️ | ✅ | ✅ |
| Web Vitals | ✅ | ✅ | ✅ | ✅ |

### Mobile Browsers
| Feature | Chrome (Android) | Safari (iOS) | Firefox Mobile |
|---------|------------------|--------------|----------------|
| Employee Portal | ✅ | ✅ | ✅ |
| Bottom Navigation | ✅ | ✅ | ✅ |
| Pull-to-Refresh | ✅ | ✅ | ⚠️ |
| Push Notifications | ✅ | ⚠️ Limited | ❌ |

---

## Performance Testing

### Lighthouse Audit
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Mobile" device
4. Select all categories
5. Click "Generate report"

**Expected Scores:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: 100

### Network Throttling
1. Open DevTools > Network tab
2. Select "Fast 3G" throttling
3. Reload page
4. [ ] Page loads in < 3 seconds
5. [ ] Loading states display properly
6. [ ] Images load progressively

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Skip navigation link works
- [ ] Modal traps focus properly

### Screen Reader
- [ ] All images have alt text
- [ ] Buttons have aria-labels
- [ ] Form fields have labels
- [ ] Status messages are announced

### Color Contrast
- [ ] Text meets 4.5:1 contrast ratio
- [ ] Interactive elements are distinguishable
- [ ] Status indicators use color + icon/text

---

## Error Handling Testing

### Network Errors
1. Disconnect network mid-action
2. [ ] Offline indicator appears
3. [ ] Action is queued
4. [ ] Reconnect and verify sync

### Invalid Data
1. Try to submit empty forms
2. [ ] Validation errors display
3. [ ] Error messages are helpful
4. [ ] Fields are highlighted

### Permission Denied
1. Block notifications in browser
2. [ ] App handles gracefully
3. [ ] Shows appropriate message
4. [ ] Doesn't break other features

---

## Regression Testing

Before deployment, verify:
- [ ] All existing features still work
- [ ] Desktop sidebar navigation works
- [ ] Admin features are unaffected
- [ ] Other product modules (Recruitment, Payroll, HRIS, ScheduleHub) work
- [ ] Authentication flow works
- [ ] Settings pages load

---

## Known Limitations

### iOS Safari
- Push notifications require user to "Add to Home Screen" first
- Background sync not available
- Limited service worker capabilities

### Firefox Mobile
- No install prompt for PWA
- Limited push notification support

### Older Browsers
- IndexedDB may not be available
- Service workers not supported (< Chrome 45, Safari 11.1)
- Modern JavaScript features may need polyfills

---

## Bug Reporting Template

If you find issues, report with:
```
**Description:**
Brief description of the issue

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- Device: [iPhone 13, Samsung Galaxy S21, etc.]
- OS: [iOS 15, Android 12, etc.]
- Browser: [Safari 15, Chrome 96, etc.]
- Network: [4G, WiFi, Offline]

**Screenshots:**
Attach if applicable

**Console Errors:**
Copy any error messages from browser console
```

---

## Test Completion Checklist

### Phase 2 Features
- [ ] Employee Home Page
- [ ] Quick Clock-In Widget
- [ ] Schedule Viewer
- [ ] Payslips Page
- [ ] Time Off Requests
- [ ] Profile Management

### Phase 3 Features
- [ ] Offline Indicator
- [ ] IndexedDB Storage
- [ ] Push Notifications
- [ ] Performance Monitoring
- [ ] Pull-to-Refresh

### Cross-Browser
- [ ] Chrome Desktop
- [ ] Safari Desktop
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Firefox Mobile

### Performance
- [ ] Lighthouse audit > 90
- [ ] Core Web Vitals "Good"
- [ ] Bundle size < 500 KB
- [ ] Load time < 3s on 3G

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast
- [ ] Touch targets

---

## Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Build Version:** _______________  
**Status:** ☐ Pass ☐ Fail  
**Notes:** _______________

---

**Testing Completed:** ☐  
**Ready for Production:** ☐
