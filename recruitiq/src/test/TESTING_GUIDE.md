# Candidate Portal Testing Guide

## Quick Start

### Start Development Server
```powershell
cd c:\RecruitIQ\recruitiq
npm run dev
```

Server will start at: **http://localhost:5173/**

## Test Scenarios

### Scenario 1: Browse Public Job Listings
**Goal:** Verify candidates can see all published jobs

1. Open browser: http://localhost:5173/careers/1
2. ✅ Verify "Join Our Team" header displays
3. ✅ Verify "2 open positions" count shows
4. ✅ Verify 2 job cards display (Frontend Engineer, Backend Engineer)
5. ✅ Test search: Type "Frontend" in search box
6. ✅ Verify only Frontend Engineer shows
7. ✅ Test filter: Select "Engineering" from Department dropdown
8. ✅ Verify both jobs still show
9. ✅ Test filter: Select "Remote" from Location dropdown
10. ✅ Verify only Frontend Engineer shows
11. ✅ Click "Clear all filters"
12. ✅ Verify all jobs show again

### Scenario 2: Apply to Job
**Goal:** Verify complete application flow

1. From career page, click "Apply Now" on Frontend Engineer
2. ✅ Verify redirects to http://localhost:5173/apply/1
3. ✅ Verify job details display:
   - Title: "Frontend Engineer"
   - Company: "TechCorp Inc."
   - Salary: "$120,000 - $180,000"
   - Posted date: "8 days ago"
   - Application count: "28 applications"
4. ✅ Fill out form:
   - Name: "Test Candidate"
   - Email: "test@example.com"
   - Phone: "(555) 999-8888"
   - Location: "San Francisco, CA"
   - Cover Letter: "I am excited to apply..."
   - LinkedIn: (optional)
   - Portfolio: (optional)
5. ✅ Click "Submit Application"
6. ✅ Verify redirects to success page
7. ✅ Verify success message displays
8. ✅ Verify tracking code displays (starts with "TRACK-")
9. ✅ Click "Copy" button next to tracking code
10. ✅ Verify "Copied!" confirmation shows
11. ✅ Note the tracking code for next scenario

### Scenario 3: Track Application
**Goal:** Verify status tracking works

1. Click "Track Your Application" button on success page
2. ✅ Verify redirects to tracking page
3. ✅ Verify application status card displays:
   - Job title: "Frontend Engineer"
   - Current stage badge
   - Applied date
   - Your info (name, email, phone, location)
4. ✅ Verify stage progress timeline shows:
   - Flow template stages in order
   - Current stage highlighted
   - Future stages grayed out
5. ✅ Verify "Communications" section shows (if any messages)
6. ✅ Click "View More Jobs" button
7. ✅ Verify redirects back to career page

### Scenario 4: Verify Existing Applications
**Goal:** Test with pre-existing tracking codes

1. Open: http://localhost:5173/track/TRACK-A1B2C3D4
2. ✅ Verify Alice Johnson's application displays
3. ✅ Verify current stage: "Phone Screen"
4. ✅ Verify 2 communications show
5. ✅ Verify interview invitation displays

6. Open: http://localhost:5173/track/TRACK-E5F6G7H8
7. ✅ Verify Bob Smith's application displays
8. ✅ Verify current stage: "Applied"
9. ✅ Verify 1 communication shows

10. Open: http://localhost:5173/track/INVALID-CODE
11. ✅ Verify "Application Not Found" message displays

### Scenario 5: Recruiter View
**Goal:** Verify recruiter can manage public portal

1. Navigate to: http://localhost:5173/login
2. ✅ Login as recruiter (if auth enabled)
3. ✅ Navigate to Jobs page
4. ✅ Click on "Frontend Engineer" job
5. ✅ Scroll to "Public Career Portal" section
6. ✅ Verify toggle switch is ON (green)
7. ✅ Verify public URL displays
8. ✅ Click "Copy" button
9. ✅ Paste URL in new incognito window
10. ✅ Verify job application page loads
11. ✅ Return to job detail
12. ✅ Verify analytics show: Views: 342, Applications: 28
13. ✅ Click "Preview Page" button
14. ✅ Verify opens job application in new tab
15. ✅ Toggle switch OFF
16. ✅ Verify public URL section hides
17. ✅ Open public URL in incognito
18. ✅ Verify "Job not available" message shows
19. ✅ Toggle switch back ON

### Scenario 6: Create/Edit Job with Public Portal
**Goal:** Verify job creation includes public portal settings

1. Navigate to: http://localhost:5173/jobs/new
2. ✅ Fill basics step (title, department, etc.)
3. ✅ Select flow template
4. ✅ Navigate to "Distribution" step
5. ✅ Verify "Public Career Portal" section displays (green highlighted box)
6. ✅ Check "Enable Public Applications" checkbox
7. ✅ Fill company details:
   - Company Name: "Test Corp"
   - Company Logo URL: (any URL)
   - Company Description: "We are a test company"
8. ✅ Fill salary range:
   - Min Salary: 100000
   - Max Salary: 150000
9. ✅ Check "Show publicly" for salary
10. ✅ Click "Save Draft" or "Publish"
11. ✅ Navigate to job detail
12. ✅ Verify public portal is enabled
13. ✅ Copy and test public URL

### Scenario 7: Dark Mode
**Goal:** Verify dark mode works on public pages

1. Toggle dark mode in your browser (or OS setting)
2. ✅ Visit career page: http://localhost:5173/careers/1
3. ✅ Verify dark theme applies (dark background, light text)
4. ✅ Visit job application page
5. ✅ Verify dark theme applies
6. ✅ Visit tracking page
7. ✅ Verify dark theme applies
8. ✅ Visit success page
9. ✅ Verify dark theme applies

### Scenario 8: Mobile Responsive
**Goal:** Verify mobile layout works

1. Open DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. ✅ Visit career page
5. ✅ Verify job cards stack vertically
6. ✅ Verify filters work on mobile
7. ✅ Visit job application page
8. ✅ Verify form fields stack vertically
9. ✅ Verify "Apply Now" button is full-width
10. ✅ Visit tracking page
11. ✅ Verify status card and timeline are readable

### Scenario 9: Form Validation
**Goal:** Verify validation errors display

1. Visit: http://localhost:5173/apply/1
2. ✅ Click "Submit Application" without filling form
3. ✅ Verify error messages show for required fields:
   - "Name is required"
   - "Email is required"
   - "Phone is required"
   - "Location is required"
4. ✅ Fill name: "Test"
5. ✅ Fill email: "invalid-email"
6. ✅ Click submit
7. ✅ Verify "Valid email is required" shows
8. ✅ Fix email to: "test@example.com"
9. ✅ Fill remaining required fields
10. ✅ Click submit
11. ✅ Verify submission succeeds

### Scenario 10: Job Not Found
**Goal:** Verify error handling

1. Visit: http://localhost:5173/apply/999
2. ✅ Verify "Job Not Found" message displays

3. Visit: http://localhost:5173/apply/3
   (Job #3 is Product Designer with public portal disabled)
4. ✅ Verify "Job Not Available" message displays

## Integration Test with Recruiter Dashboard

### Full Flow
1. **Recruiter:** Create new job with public portal enabled
2. **Candidate:** Browse careers page and find job
3. **Candidate:** Apply to job
4. **Candidate:** Receive tracking code
5. **Recruiter:** View new candidate in dashboard
6. **Recruiter:** Update candidate stage
7. **Candidate:** Check tracking page and see updated stage
8. **Recruiter:** Add communication message
9. **Candidate:** See new message on tracking page

### Expected Results
- [x] Candidate appears in recruiter's candidate list
- [x] `applicationSource` is "public-portal"
- [x] `trackingCode` is set and valid
- [x] Stage matches flow template's first stage
- [x] Application data is saved
- [x] Job's application counter increments

## Performance Testing

### Load Test
1. Open 5-10 browser tabs
2. Navigate to career page in each
3. ✅ Verify page loads quickly (< 2 seconds)

### Search Performance
1. Visit career page
2. Type quickly in search box
3. ✅ Verify debounced search (not instant)
4. ✅ Verify results update smoothly

## Accessibility Testing

### Keyboard Navigation
1. Visit career page
2. Use Tab key to navigate
3. ✅ Verify all interactive elements are reachable
4. ✅ Verify focus indicators show

### Screen Reader
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate through application form
3. ✅ Verify labels are read correctly
4. ✅ Verify error messages are announced

## Browser Compatibility

### Test Browsers
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if on Mac)

### Test Actions in Each Browser
1. Apply to job
2. Track application
3. Browse careers page
4. Toggle dark mode

## Checklist Summary

- [ ] All test scenarios pass
- [ ] Dark mode works on all pages
- [ ] Mobile responsive on all pages
- [ ] Form validation works correctly
- [ ] Error states display properly
- [ ] Integration with recruiter dashboard verified
- [ ] Performance is acceptable
- [ ] Accessibility basics covered
- [ ] Works in multiple browsers

## Reporting Issues

If you find bugs, document:
1. **What:** Brief description
2. **Steps to reproduce:** Numbered list
3. **Expected:** What should happen
4. **Actual:** What actually happened
5. **Screenshot:** If visual issue
6. **Console errors:** If any (F12 → Console tab)

## Next Steps After Testing
1. Fix any issues found
2. Add backend API integration
3. Implement email notifications
4. Add file upload for resumes
5. Set up production deployment
6. Create user documentation

---

**Happy Testing!** 🎉
