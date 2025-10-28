Feature: Recruiter Public Portal Management
  As a recruiter
  I want to publish jobs to a public career portal
  So that candidates can easily discover and apply to open positions

  Background:
    Given I am logged in as a recruiter
    And I have access to job management features

  # ===== JOB PUBLISHING =====
  
  Scenario: Publish a job to the public career portal
    Given I am viewing a job detail page
    And the job is currently unpublished
    When I toggle the "Public Career Portal" switch
    Then the job should be published to the public portal
    And I should see the public job URL
    And I should see view count metrics
    And I should see application count metrics
    And I should see a "Copy URL" button
    And I should see a "Preview Page" link

  Scenario: Unpublish a job from the career portal
    Given I am viewing a published job detail page
    When I toggle the "Public Career Portal" switch off
    Then the job should be unpublished
    And the public URL should be hidden
    And I should see benefits of publishing
    And I should see "Reach more candidates" message
    And I should see "Easy application process" message

  Scenario: Copy public job URL to clipboard
    Given I am viewing a published job detail page
    When I click the "Copy" button
    Then the public job URL should be copied to my clipboard
    And I should see a "Copied!" success message
    And the success message should disappear after 2 seconds

  Scenario: Preview public job page
    Given I am viewing a published job detail page
    When I click the "Preview Page" link
    Then a new browser tab should open
    And the public job application page should be displayed
    And the job title should be visible
    And the job description should be visible
    And the application form should be visible

  Scenario: View metrics for published job
    Given I am viewing a published job detail page
    Then I should see the view count metric
    And I should see the application count metric
    And the metrics should update when refreshed

  # ===== PORTAL SETTINGS =====

  Scenario: Open portal settings modal
    Given I am viewing a published job detail page
    When I click the "Configure Portal Settings" button
    Then the portal settings modal should open
    And I should see company name field
    And I should see company logo URL field
    And I should see salary visibility toggle
    And I should see custom fields section

  Scenario: Configure company branding
    Given I have the portal settings modal open
    When I enter "RecruitIQ Inc." in the company name field
    And I enter "https://example.com/logo.png" in the logo URL field
    And I check the "Show salary in job listings" checkbox
    And I click "Save Settings"
    Then the settings should be saved
    And I should see a success notification
    And the modal should close

  Scenario: Add custom application field
    Given I have the portal settings modal open
    When I click "Add Field"
    And I enter "LinkedIn Profile" as the field label
    And I select "URL" as the field type
    And I mark the field as required
    And I click "Save Settings"
    Then the custom field should be added
    And candidates should see this field on the application form

  Scenario: Add multiple custom fields
    Given I have the portal settings modal open
    When I add a custom field "LinkedIn Profile" of type "URL"
    And I add a custom field "Portfolio Website" of type "URL"
    And I add a custom field "Years of Experience" of type "Number"
    And I add a custom field "Cover Letter" of type "Textarea"
    And I click "Save Settings"
    Then all 4 custom fields should be saved
    And they should appear in order on the application form

  Scenario: Remove custom field
    Given I have the portal settings modal open
    And I have added a custom field "Test Field"
    When I click the remove button on "Test Field"
    Then the field should be removed from the list
    And the field count should decrease by 1

  Scenario: Reorder custom fields
    Given I have the portal settings modal open
    And I have 3 custom fields configured
    When I drag "Field 3" above "Field 1"
    Then the field order should update
    And "Field 3" should now be first in the list

  Scenario: Close settings modal without saving
    Given I have the portal settings modal open
    When I make changes to company name
    And I click "Cancel"
    Then the modal should close
    And the changes should not be saved
    And I should not see a success notification

  Scenario: Validate required fields in settings
    Given I have the portal settings modal open
    When I clear the company name field
    And I click "Save Settings"
    Then I should see a validation error
    And the settings should not be saved
    And the modal should remain open

  Scenario: Persist settings across sessions
    Given I have configured portal settings with company name "Test Company"
    And I have saved the settings
    When I navigate away from the page
    And I return to the job detail page
    And I open the portal settings modal
    Then the company name should still be "Test Company"
    And all other settings should be preserved

  # ===== APPLICATION SOURCE TRACKING =====

  Scenario: Display application source badge on candidates list
    Given I am on the candidates page
    And there are candidates with different application sources
    Then I should see source badges on candidate cards
    And each badge should display the source type
    And each badge should have appropriate color coding
    And each badge should have a matching icon

  Scenario: Display application source on candidate detail
    Given I am viewing a candidate detail page
    And the candidate applied through the public portal
    Then I should see a "Public Portal" badge
    And the badge should be emerald colored
    And the badge should have a globe icon
    And the badge should be next to the candidate's title

  Scenario: Display application source on pipeline
    Given I am on the pipeline page
    And there are candidates in different stages
    Then I should see source badges on pipeline cards
    And the badges should be compact size
    And the badges should not overlap other information

  Scenario: Show tooltip on badge hover
    Given I am viewing a candidate with a source badge
    When I hover over the application source badge
    Then a tooltip should appear
    And the tooltip should describe the source
    And the tooltip should say "Applied through public career page" for public portal

  Scenario: Track all 7 application source types
    Given candidates have applied through different channels
    Then I should see "Public Portal" badge for career page applications
    And I should see "Referral" badge for employee referrals
    And I should see "LinkedIn" badge for LinkedIn applications
    And I should see "Indeed" badge for Indeed applications
    And I should see "Email" badge for email applications
    And I should see "Manual" badge for manually added candidates
    And I should see "API" badge for API integrations
    And each should have distinct colors and icons

  # ===== END-TO-END FLOW =====

  Scenario: Complete public application flow
    Given I am logged in as a recruiter
    When I publish a job to the public portal
    And I copy the public job URL
    And I open the URL in an incognito browser
    And I fill out the application form as a candidate
    And I submit the application
    Then I should see a success page with tracking code
    And when I return to the recruiter dashboard
    And I navigate to the candidates page
    Then I should see the new candidate
    And the candidate should have a "Public Portal" badge
    And the candidate should be in the "Applied" stage

  Scenario: Track application through journey
    Given a candidate has applied through the public portal
    And the candidate has a tracking code
    When the candidate visits the tracking page
    Then they should see their application status
    And they should see which stage they are in
    And when I move the candidate to "Phone Screen" stage
    And the candidate refreshes the tracking page
    Then they should see the updated status
    And the source badge should remain "Public Portal"

  # ===== ANALYTICS =====

  Scenario: Track job publish events
    Given analytics tracking is enabled
    When I publish a job to the public portal
    Then a "job_published" event should be tracked
    And the event should include job ID
    And the event should include timestamp
    And the event should include user ID

  Scenario: Track portal settings changes
    Given analytics tracking is enabled
    When I save portal settings
    Then a "portal_settings_updated" event should be tracked
    And the event should include which settings changed
    And the event should include the job ID

  Scenario: Track public job views
    Given I have a published job
    When a candidate views the public job page
    Then the view count should increment
    And a "job_viewed" event should be tracked
    And the metric should update on the recruiter dashboard

  Scenario: Track application submissions
    Given I have a published job
    When a candidate submits an application
    Then the application count should increment
    And a "application_submitted" event should be tracked
    And the metric should be visible to recruiters immediately

  # ===== ERROR HANDLING =====

  Scenario: Handle API error when publishing job
    Given I am viewing an unpublished job
    And the backend API is temporarily unavailable
    When I attempt to publish the job
    Then I should see an error message
    And the toggle should remain in unpublished state
    And I should be able to retry the action

  Scenario: Handle API error when saving settings
    Given I have the portal settings modal open
    And the backend API returns an error
    When I click "Save Settings"
    Then I should see an error notification
    And the modal should remain open
    And my changes should not be lost
    And I should be able to retry saving

  Scenario: Handle missing application source gracefully
    Given I am viewing candidates
    And some candidates do not have an application_source field
    Then no badge should be displayed for those candidates
    And the candidate card should still render correctly
    And no JavaScript errors should occur

  # ===== PERMISSIONS =====

  Scenario: Only recruiters can publish jobs
    Given I am logged in as a hiring manager
    When I view a job detail page
    Then I should not see the publish toggle
    And I should see a message about permissions

  Scenario: Only admins can configure portal settings
    Given I am logged in as a recruiter (non-admin)
    And I am viewing a published job
    Then I should see the publish toggle
    But I should not see the "Configure Portal Settings" button

  # ===== PERFORMANCE =====

  Scenario: Fast load times for published jobs
    Given I have 100 published jobs
    When I navigate to the jobs list
    Then the page should load in under 2 seconds
    And all publish status indicators should be visible

  Scenario: Efficient badge rendering
    Given I have 500 candidates with various sources
    When I view the candidates page
    Then all badges should render in under 1 second
    And scrolling should be smooth

  # ===== ACCESSIBILITY =====

  Scenario: Keyboard navigation for publish toggle
    Given I am on a job detail page
    When I tab to the publish toggle
    And I press Enter or Space
    Then the job should be published/unpublished
    And focus should remain on the toggle

  Scenario: Screen reader support for badges
    Given I am using a screen reader
    When I navigate to a candidate with a source badge
    Then the screen reader should announce the source
    And it should say "Applied through public portal" for public applications

  Scenario: Accessible modal dialogs
    Given I open the portal settings modal
    Then focus should move to the modal
    And I should be able to tab through all fields
    And pressing Escape should close the modal
    And focus should return to the trigger button

  # ===== MOBILE RESPONSIVENESS =====

  Scenario: Mobile view of publish toggle
    Given I am on a mobile device
    When I view a job detail page
    Then the publish toggle should be easily tappable
    And the public URL should wrap properly
    And the metrics should stack vertically

  Scenario: Mobile view of source badges
    Given I am on a mobile device
    When I view the candidates page
    Then the source badges should be visible
    And they should not overflow the card
    And they should remain readable

  # ===== INTEGRATION WITH EXISTING FEATURES =====

  Scenario: Published jobs appear on career page
    Given I publish a job with title "Senior Engineer"
    When I navigate to the public career page
    Then "Senior Engineer" should be in the job listings
    And clicking it should open the application page

  Scenario: Portal settings affect public view
    Given I configure company name as "RecruitIQ"
    And I enable salary visibility
    When a candidate views the public job page
    Then they should see "RecruitIQ" as the company name
    And they should see the salary range
    And they should see all custom application fields

  Scenario: Source badge persists through stage changes
    Given a candidate has "Public Portal" as their source
    When I move them through multiple pipeline stages
    Then the source badge should always display "Public Portal"
    And the badge should never change

  Scenario: Unpublishing hides job from career page
    Given I have a published job visible on the career page
    When I unpublish the job
    And I refresh the career page
    Then the job should no longer appear in the listings
    And attempting to access the apply URL should show "Job not found"
