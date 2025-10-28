Feature: Hiring Flow Template Management
  As a recruiter
  I want to create and manage hiring flow templates
  So that I can standardize the recruitment process across all job postings

  Background:
    Given I am logged in as a recruiter
    And I am on the workspace settings page

  # Happy Path Scenarios
  Scenario: Create a new hiring flow template with multiple stages
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    Then the flow designer modal should open
    When I fill in "Flow Name" with "Technical Interview Process"
    And I fill in "Flow Description" with "Standard process for technical roles"
    And I add the following stages:
      | Stage Name         | Color   |
      | Application Review | blue    |
      | Phone Screen       | cyan    |
      | Technical Test     | yellow  |
      | Onsite Interview   | orange  |
      | Offer             | green   |
    And I click "Save Flow Template"
    Then I should see a success message "Flow template created successfully"
    And "Technical Interview Process" should appear in the flow templates list
    And the template should show "5 stages"

  Scenario: Create a minimal flow template with 2 stages
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    And I fill in "Flow Name" with "Quick Hire Process"
    And I add stage "Initial Review"
    And I add stage "Final Decision"
    And I click "Save Flow Template"
    Then I should see a success message "Flow template created successfully"
    And "Quick Hire Process" should appear in the flow templates list

  # Validation Scenarios
  Scenario: Cannot create flow without a name
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    And I leave "Flow Name" empty
    And I add 2 stages
    And I click "Save Flow Template"
    Then I should see validation error "Flow template name is required"
    And the modal should remain open

  Scenario: Cannot create flow with fewer than 2 stages
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    And I fill in "Flow Name" with "Invalid Flow"
    And I add only 1 stage "Review"
    And I click "Save Flow Template"
    Then I should see validation error "At least 2 stages are required"
    And the "Add Stage" button should be highlighted

  Scenario: Cannot create flow with empty stage names
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    And I fill in "Flow Name" with "Engineering Process"
    And I add a stage with empty name
    And I click "Save Flow Template"
    Then I should see validation error "All stages must have a name"
    And the empty stage field should be highlighted

  Scenario: Cannot create flow with duplicate stage names
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    And I fill in "Flow Name" with "Sales Process"
    And I add stage "Interview"
    And I add stage "Interview"
    And I click "Save Flow Template"
    Then I should see validation error "Stage names must be unique"
    And the duplicate stage fields should be highlighted

  # Flow Management Scenarios
  Scenario: View list of existing flow templates
    Given I have created the following flow templates:
      | Name                    | Stages |
      | Engineering Process     | 5      |
      | Sales Process          | 4      |
      | Internship Process     | 3      |
    When I click on the "Hiring Flows" tab
    Then I should see all 3 flow templates listed
    And each template should show its name and stage count

  Scenario: View flow template details
    Given I have a flow template "Marketing Process" with 4 stages
    When I click on the "Hiring Flows" tab
    And I click on "Marketing Process"
    Then I should see the template details
    And I should see all 4 stages with their colors
    And I should see stage order indicators

  Scenario: Edit an existing flow template
    Given I have a flow template "Design Process" with 3 stages
    When I click on the "Hiring Flows" tab
    And I click "Edit" on "Design Process"
    Then the flow designer should open with existing data
    When I update "Flow Name" to "UX Design Process"
    And I add a new stage "Portfolio Review" at position 2
    And I click "Save Flow Template"
    Then I should see a success message "Flow template updated successfully"
    And the updated template should appear in the list

  Scenario: Delete a flow template that is not in use
    Given I have a flow template "Old Process" that is not used by any jobs
    When I click on the "Hiring Flows" tab
    And I click "Delete" on "Old Process"
    And I confirm the deletion
    Then I should see a success message "Flow template deleted successfully"
    And "Old Process" should not appear in the list

  Scenario: Cannot delete a flow template that is in use
    Given I have a flow template "Active Process"
    And 3 jobs are using "Active Process"
    When I click on the "Hiring Flows" tab
    And I click "Delete" on "Active Process"
    Then I should see a warning message "This flow is used by 3 active jobs"
    And the delete button should be disabled
    And I should see a link to view the jobs using this flow

  Scenario: Clone an existing flow template
    Given I have a flow template "Engineering Process" with 5 stages
    When I click on the "Hiring Flows" tab
    And I click "Clone" on "Engineering Process"
    Then the flow designer should open
    And the form should be pre-filled with "Engineering Process (Copy)"
    And all stages should be copied
    When I update "Flow Name" to "Senior Engineering Process"
    And I click "Save Flow Template"
    Then both flow templates should exist in the list

  # Stage Management Scenarios
  Scenario: Add a new stage to flow
    When I am creating a new flow template
    And I have 2 existing stages
    And I click "Add Stage"
    Then a new empty stage field should appear
    And I should be able to fill in the stage name
    And I should be able to select a stage color

  Scenario: Remove a stage from flow
    When I am creating a new flow template
    And I have 3 stages added
    And I click "Remove" on the second stage
    Then the second stage should be removed
    And I should have 2 stages remaining
    And the remaining stages should reorder automatically

  Scenario: Reorder stages using drag and drop
    When I am editing a flow template
    And I have stages in order: "Application", "Phone", "Interview", "Offer"
    And I drag "Interview" stage before "Phone" stage
    Then the new order should be: "Application", "Interview", "Phone", "Offer"
    And the stage numbers should update automatically

  Scenario: Set stage colors
    When I am creating a new flow template
    And I add a new stage "Technical Review"
    And I click on the color picker for "Technical Review"
    Then I should see color options: blue, cyan, green, yellow, orange, red, purple, gray
    When I select "purple"
    Then the stage should display with purple color
    And the preview should show the purple indicator

  Scenario: Mark initial and final stages
    When I am creating a new flow template
    And I have 4 stages
    Then the first stage should be automatically marked as "Initial Stage"
    And the last stage should be automatically marked as "Final Stage"
    And I should not be able to change these markers

  # Job Integration Scenarios
  Scenario: Use flow template when creating a job
    Given I have a flow template "Engineering Process"
    When I create a new job posting
    And I select "Engineering Process" from the flow template dropdown
    And I complete the job creation
    Then the job should be associated with "Engineering Process"
    And candidates for this job should follow the Engineering Process stages

  Scenario: View candidates in flow stages (Pipeline View)
    Given I have a job "Backend Engineer" using "Engineering Process" flow
    And I have candidates in different stages:
      | Candidate Name | Current Stage  |
      | Alice Johnson  | Phone Screen   |
      | Bob Smith      | Technical Test |
      | Carol White    | Onsite Interview |
    When I view the job pipeline
    Then I should see a Kanban board with all stages
    And "Alice Johnson" should appear in "Phone Screen" column
    And "Bob Smith" should appear in "Technical Test" column
    And "Carol White" should appear in "Onsite Interview" column

  Scenario: Move candidate between stages
    Given I have a job with candidate "John Doe" in "Phone Screen" stage
    When I view the job pipeline
    And I drag "John Doe" from "Phone Screen" to "Technical Test"
    Then "John Doe" should appear in "Technical Test" stage
    And the candidate's stage history should be updated
    And a notification should be sent to "John Doe"

  # Edge Cases
  Scenario: Create flow with maximum number of stages (10 stages)
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    And I fill in "Flow Name" with "Comprehensive Process"
    And I add 10 stages with unique names
    And I click "Save Flow Template"
    Then the flow should be created successfully
    And all 10 stages should be displayed
    And the stage limit message should appear

  Scenario: Cannot add more than 10 stages
    When I am creating a new flow template
    And I have already added 10 stages
    Then the "Add Stage" button should be disabled
    And I should see a message "Maximum 10 stages allowed"

  Scenario: Handle special characters in flow and stage names
    When I click on the "Hiring Flows" tab
    And I click "Create New Flow Template"
    And I fill in "Flow Name" with "C++ / C# Developer Process (Sr.)"
    And I add stage "Pre-Screen & Initial Contact"
    And I add stage "Technical Test [Required]"
    And I click "Save Flow Template"
    Then the flow should be created successfully
    And special characters should be preserved

  Scenario: Handle API errors during flow creation
    Given the API server is temporarily unavailable
    When I attempt to save a new flow template
    Then I should see an error message "Failed to save flow template. Please try again."
    And the modal should remain open
    And my form data should be preserved

  Scenario: Lazy loading - Flow templates should not load on dashboard
    When I navigate to the dashboard
    Then no API call should be made to fetch flow templates
    When I navigate to the job creation page
    Then the flow templates API should be called
    And flow templates should be loaded into the dropdown

  # Visual Regression Tests
  Scenario: Flow designer modal appearance
    When I open the flow designer modal
    Then the modal should match the visual regression snapshot
    And all UI elements should be properly aligned
    And colors should match the design system

  Scenario: Flow list display
    Given I have 5 flow templates
    When I view the Hiring Flows tab
    Then the flow list should match the visual regression snapshot
    And each flow card should display correctly

  Scenario: Dark mode support
    Given I have dark mode enabled
    When I open the flow designer modal
    Then the modal should render correctly in dark mode
    And all colors should have appropriate contrast
    And the dark mode snapshot should match

  Scenario: Mobile responsive flow designer
    Given I am using a mobile device
    When I open the flow designer modal
    Then the modal should adapt to mobile screen size
    And all fields should be accessible
    And stage management should work with touch gestures

  # Performance Scenarios
  Scenario: Create flow with many stages quickly
    When I create a flow with 10 stages
    Then the flow should be saved within 2 seconds
    And the UI should remain responsive

  Scenario: Load workspace with many flow templates
    Given I have 50 flow templates created
    When I navigate to the Hiring Flows tab
    Then all templates should load within 3 seconds
    And the list should be scrollable
    And pagination should be available

  # Data Persistence
  Scenario: Flow template data persists after page refresh
    Given I have created a flow template "Test Process"
    When I refresh the page
    And I navigate to the Hiring Flows tab
    Then "Test Process" should still appear in the list
    And all stage data should be intact

  Scenario: Flow changes sync across multiple browser tabs
    Given I have the Hiring Flows tab open in two browser tabs
    When I create a new flow in Tab 1
    And I switch to Tab 2
    Then the new flow should appear in Tab 2's list
    And both tabs should show the same data

  # Permissions & Security
  Scenario: Only authorized roles can create flows
    Given I am logged in as a "Viewer" role user
    When I navigate to the Hiring Flows tab
    Then the "Create New Flow Template" button should not be visible
    And I should only see existing flow templates in read-only mode

  Scenario: Audit trail for flow changes
    Given I am logged in as "admin@company.com"
    When I edit a flow template "Sales Process"
    And I add a new stage "Final Review"
    And I save the changes
    Then the flow should have an audit entry
    And the entry should show:
      | Field         | Value                  |
      | Modified By   | admin@company.com      |
      | Action        | Updated                |
      | Changes       | Added stage: Final Review |
      | Timestamp     | Current date/time      |
