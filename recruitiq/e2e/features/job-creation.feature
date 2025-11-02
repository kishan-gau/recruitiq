Feature: Job Creation and Management
  As a recruiter
  I want to create and manage job postings
  So that I can attract qualified candidates

  Background:
    Given I am logged in as a recruiter
    And I have at least one hiring flow template created
    And I am on the "Create Job" page

  # Happy Path Scenarios
  Scenario: Create a new job posting with all required fields
    When I fill in "Job Title" with "Senior QA Engineer"
    And I select "Engineering" from "Department"
    And I select "San Francisco" from "Location"
    And I select "full-time" from "Employment Type"
    And I select "Standard Interview Process" from "Flow Template"
    And I click "Next" to go to description step
    And I fill in "Job Description" with "We are looking for an experienced QA Engineer..."
    And I click "Next" to go to requirements step
    And I fill in "Requirements" with "5+ years of experience in QA testing..."
    And I click "Next" to go to compliance step
    And I click "Next" to go to distribution step
    And I click "Publish Job"
    Then I should see a success message "Job created successfully"
    And I should be redirected to the jobs list page
    And I should see "Senior QA Engineer" in the jobs list

  Scenario: Create a job posting with minimal required fields only
    When I fill in "Job Title" with "Junior Developer"
    And I select "Standard Interview Process" from "Flow Template"
    And I fill in "Job Description" with "Entry level position"
    And I click "Publish Job"
    Then I should see a success message "Job created successfully"
    And I should see "Junior Developer" in the jobs list

  # Validation Scenarios
  Scenario: Cannot publish job without required job title
    When I leave "Job Title" empty
    And I select "Standard Interview Process" from "Flow Template"
    And I fill in "Job Description" with "Some description"
    And I click "Publish Job"
    Then I should see validation error "Job title is required"
    And I should remain on the job creation page
    And the "Job Title" field should be highlighted in red

  Scenario: Cannot publish job without selecting a flow template
    When I fill in "Job Title" with "Backend Developer"
    And I fill in "Job Description" with "Some description"
    And I leave "Flow Template" unselected
    And I click "Publish Job"
    Then I should see validation error "Flow template is required"
    And I should be navigated to the basics step
    And the "Flow Template" field should be highlighted in red

  Scenario: Cannot publish job without job description
    When I fill in "Job Title" with "Frontend Developer"
    And I select "Standard Interview Process" from "Flow Template"
    And I leave "Job Description" empty
    And I click "Publish Job"
    Then I should see validation error "Job description is required"
    And I should be navigated to the description step
    And the "Job Description" field should be highlighted in red

  Scenario: Job title must be at least 2 characters long
    When I fill in "Job Title" with "A"
    And I blur from the "Job Title" field
    Then I should see validation error "Job title must be at least 2 characters"
    And the "Job Title" field should be highlighted in red

  Scenario: Job description must be at least 10 characters long
    When I fill in "Job Title" with "Developer"
    And I select "Standard Interview Process" from "Flow Template"
    And I fill in "Job Description" with "Short"
    And I blur from the "Job Description" field
    Then I should see validation error "Description must be at least 10 characters"

  # Navigation Scenarios
  Scenario: Navigate between form steps using Next/Previous buttons
    When I am on the "Basics" step
    And I click "Next"
    Then I should be on the "Description" step
    When I click "Next"
    Then I should be on the "Requirements" step
    When I click "Previous"
    Then I should be on the "Description" step

  Scenario: Navigate between form steps using sidebar
    When I am on the "Basics" step
    And I click "Requirements" in the sidebar
    Then I should be on the "Requirements" step
    And the "Requirements" step should be highlighted in the sidebar

  Scenario: Cannot skip required steps using sidebar navigation
    When I am on the "Basics" step
    And I leave required fields empty
    And I click "Distribution" in the sidebar
    Then I should see validation errors for required fields
    And I should remain on the "Basics" step

  # Draft Scenarios
  Scenario: Save job as draft
    When I fill in "Job Title" with "Product Manager"
    And I select "Standard Interview Process" from "Flow Template"
    And I fill in "Job Description" with "We are hiring a PM..."
    And I click "Save as Draft"
    Then I should see a success message "Job saved as draft"
    And I should see "Product Manager" in the jobs list with status "Draft"

  Scenario: Edit a draft job
    Given I have a draft job "Marketing Manager"
    When I click "Edit" on "Marketing Manager"
    Then I should see the job creation form
    And the form should be pre-filled with existing job data
    When I update "Job Title" to "Senior Marketing Manager"
    And I click "Publish Job"
    Then I should see "Senior Marketing Manager" in the jobs list with status "Open"

  # Job Management Scenarios
  Scenario: View job details
    Given I have a published job "Data Scientist"
    When I click on "Data Scientist" in the jobs list
    Then I should see the job details page
    And I should see all job information displayed correctly

  Scenario: Edit a published job
    Given I have a published job "DevOps Engineer"
    When I click "Edit" on "DevOps Engineer"
    And I update "Job Description" to include additional responsibilities
    And I click "Update Job"
    Then I should see a success message "Job updated successfully"
    And the updated description should be visible on the job details page

  Scenario: Delete a job posting
    Given I have a published job "Sales Representative"
    When I click "Delete" on "Sales Representative"
    And I confirm the deletion
    Then I should see a success message "Job deleted successfully"
    And "Sales Representative" should not appear in the jobs list

  # Public Portal Scenarios
  Scenario: Enable public career portal for a job
    Given I have a published job "Software Engineer"
    When I view the job details
    And I toggle "Public Career Portal" to enabled
    Then I should see a success message "Job is now public"
    And I should see a public job URL
    When I copy the public URL
    And I visit the public URL in a new incognito window
    Then I should see the public job posting
    And I should be able to apply without logging in

  Scenario: Disable public career portal for a job
    Given I have a public job "UX Designer"
    When I view the job details
    And I toggle "Public Career Portal" to disabled
    Then I should see a success message "Job is now private"
    And the public URL should no longer be accessible

  # Edge Cases
  Scenario: Handle very long job titles
    When I fill in "Job Title" with a 250-character string
    And I fill in other required fields
    And I click "Publish Job"
    Then the job should be created successfully
    And the title should be displayed without truncation on the job details page

  Scenario: Handle special characters in job title
    When I fill in "Job Title" with "C++ / C# Developer & Architect (Sr.)"
    And I fill in other required fields
    And I click "Publish Job"
    Then the job should be created successfully
    And the title should display special characters correctly

  Scenario: Handle markdown formatting in job description
    When I fill in "Job Title" with "Content Writer"
    And I select "Standard Interview Process" from "Flow Template"
    And I fill in "Job Description" with markdown content:
      """
      ## About the Role
      We are looking for a **talented writer** with:
      - Strong writing skills
      - SEO knowledge
      - *Creative mindset*
      """
    And I click "Publish Job"
    Then the job should be created successfully
    And the description should render markdown formatting correctly

  Scenario: Handle network errors during job creation
    Given the API server is temporarily unavailable
    When I attempt to publish a job
    Then I should see an error message "Failed to create job. Please try again."
    And the form data should be preserved
    And I should be able to retry submission

  Scenario: Handle session timeout during job creation
    Given I am in the middle of creating a job
    When my session expires after 30 minutes
    And I click "Publish Job"
    Then I should be redirected to the login page
    And I should see a message "Session expired. Please login again."
    And my form data should be saved locally

  # Multi-user Scenarios
  Scenario: Multiple users editing same job concurrently
    Given User A is editing "Software Architect" job
    And User B opens the same "Software Architect" job for editing
    When User A saves changes first
    And User B attempts to save changes
    Then User B should see a conflict warning
    And User B should be able to reload the latest version

  # Performance Scenarios
  Scenario: Create job with large description (10,000+ characters)
    When I fill in "Job Title" with "Technical Writer"
    And I select "Standard Interview Process" from "Flow Template"
    And I fill in "Job Description" with 10000 characters of text
    And I click "Publish Job"
    Then the job should be created within 3 seconds
    And the full description should be saved correctly

  # Accessibility Scenarios
  Scenario: Navigate job creation form using keyboard only
    When I navigate to the job creation page
    And I use Tab key to navigate between fields
    And I use Space/Enter to select dropdowns
    And I press Enter on "Publish Job" button
    Then the job should be created successfully

  Scenario: Screen reader announces validation errors
    When I attempt to publish a job with missing required fields
    Then the screen reader should announce "3 validation errors found"
    And the screen reader should read each error message
    And focus should move to the first field with an error
