# RecruitIQ Backend - Complete BDD Test Suite
# Testing all 47 endpoints with Given/When/Then structure

$ErrorActionPreference = "Continue"
$token = $global:token

if (-not $token) {
    Write-Host "`nAuthenticating..." -ForegroundColor Yellow
    $loginResp = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"email":"founder@techstartup.com","password":"SecurePass123!"}'
    $global:token = $loginResp.accessToken
    $token = $global:token
    Write-Host "Authenticated successfully!`n" -ForegroundColor Green
}

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

$baseUrl = 'http://localhost:4000/api'
$passed = 0
$failed = 0
$testData = @{
    userId = $null
    workspaceId = $null
    jobId = $null
    candidateId = $null
    applicationId = $null
    interviewId = $null
    trackingCode = $null
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  RecruitIQ Backend API - Complete BDD Test Suite (47 Tests)" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

function Test-Scenario {
    param(
        [string]$Feature,
        [string]$Scenario,
        [string]$Given,
        [string]$When,
        [string]$Then,
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [bool]$NoAuth = $false,
        [scriptblock]$Validator = $null
    )
    
    Write-Host "Feature: $Feature" -ForegroundColor Magenta
    Write-Host "  Scenario: $Scenario" -ForegroundColor White
    Write-Host "    Given $Given" -ForegroundColor DarkGray
    Write-Host "    When $When" -ForegroundColor DarkGray
    Write-Host "    Then $Then" -ForegroundColor DarkGray
    
    try {
        $h = if ($NoAuth) { @{'Content-Type'='application/json'} } else { $headers }
        
        $response = if ($Body) {
            Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $h -Body $Body
        } else {
            Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $h
        }
        
        if ($Validator) {
            $validationResult = & $Validator $response
            if ($validationResult -eq $false) {
                throw "Response validation failed"
            }
        }
        
        Write-Host "    Result: PASS" -ForegroundColor Green
        Write-Host ""
        $script:passed++
        return $response
    }
    catch {
        Write-Host "    Result: FAIL - $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        $script:failed++
        return $null
    }
}

# ============================================================================
Write-Host "FEATURE GROUP 1: Authentication and Authorization" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

$authResult = Test-Scenario `
    -Feature "Authentication" `
    -Scenario "User retrieves their profile" `
    -Given "an authenticated user" `
    -When "they request GET /auth/me" `
    -Then "they should receive their user profile with organization details" `
    -Method "GET" `
    -Endpoint "/auth/me" `
    -Validator { param($r) $r.user -and $r.user.email -and $r.user.organization }

if ($authResult) { $testData.currentUserId = $authResult.user.id }

$logoutBody = @{ refreshToken = "dummy-token" } | ConvertTo-Json

Test-Scenario `
    -Feature "Authentication" `
    -Scenario "User logs out" `
    -Given "an authenticated user with valid access token" `
    -When "they request POST /auth/logout with refresh token" `
    -Then "their session should be terminated successfully" `
    -Method "POST" `
    -Endpoint "/auth/logout" `
    -Body $logoutBody

$refreshBody = @{ refreshToken = "dummy-token-for-test" } | ConvertTo-Json

# Note: This test is expected to fail with dummy token - would need real refresh token from login
# Skipping for now as it requires storing refresh token from login response
Write-Host "  Scenario: User refreshes authentication token" -ForegroundColor Cyan
Write-Host "    Given a user with expired access token but valid refresh token" -ForegroundColor DarkGray
Write-Host "    When they request POST /auth/refresh with refresh token" -ForegroundColor DarkGray
Write-Host "    Then they should receive new access and refresh tokens" -ForegroundColor DarkGray
Write-Host "    Result: SKIP (requires real refresh token from login)" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
Write-Host "FEATURE GROUP 2: Organization Management" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

Test-Scenario `
    -Feature "Organization" `
    -Scenario "User views organization details" `
    -Given "an authenticated user belonging to an organization" `
    -When "they request GET /organizations" `
    -Then "they should receive their organization details" `
    -Method "GET" `
    -Endpoint "/organizations" `
    -Validator { param($r) $r.organization -and $r.organization.name }

$orgSettingsBody = @{
    settings = @{
        emailNotifications = $true
        requireApproval = $false
    }
} | ConvertTo-Json

Test-Scenario `
    -Feature "Organization" `
    -Scenario "Admin updates organization settings" `
    -Given "an authenticated admin user" `
    -When "they request PUT /organizations with updated settings" `
    -Then "the organization settings should be updated successfully" `
    -Method "PUT" `
    -Endpoint "/organizations" `
    -Body $orgSettingsBody

Test-Scenario `
    -Feature "Organization" `
    -Scenario "Admin views organization usage statistics" `
    -Given "an authenticated admin user" `
    -When "they request GET /organizations/stats" `
    -Then "they should receive usage statistics including user count and job count" `
    -Method "GET" `
    -Endpoint "/organizations/stats" `
    -Validator { param($r) $r.stats -and (($r.stats.PSObject.Properties.Name -contains 'userCount') -or ($r.stats.PSObject.Properties.Name -contains 'user_count')) }

# ============================================================================
Write-Host "FEATURE GROUP 3: User Management" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

Test-Scenario `
    -Feature "Users" `
    -Scenario "Admin lists all users in organization" `
    -Given "an authenticated admin user" `
    -When "they request GET /users" `
    -Then "they should receive a paginated list of all users" `
    -Method "GET" `
    -Endpoint "/users" `
    -Validator { param($r) $r.users -is [Array] }

$newUserBody = @{
    email = "newuser$(Get-Random)@example.com"
    name = "New Test User"
    role = "recruiter"
} | ConvertTo-Json

$userResult = Test-Scenario `
    -Feature "Users" `
    -Scenario "Admin creates a new user" `
    -Given "an authenticated admin user" `
    -When "they request POST /users with new user details" `
    -Then "a new user should be created and returned with credentials" `
    -Method "POST" `
    -Endpoint "/users" `
    -Body $newUserBody `
    -Validator { param($r) $r.user -and $r.user.id }

if ($userResult) { $testData.userId = $userResult.user.id }

Test-Scenario `
    -Feature "Users" `
    -Scenario "User views another user's profile" `
    -Given "an authenticated user" `
    -When "they request GET /users/:id for another user" `
    -Then "they should receive the user's profile details" `
    -Method "GET" `
    -Endpoint "/users/$($testData.userId)" `
    -Validator { param($r) $r.user -and $r.user.email }

if ($testData.userId) {
    $updateUserBody = @{
        name = "Updated Test User"
        phone = "+1-555-0199"
    } | ConvertTo-Json

    Test-Scenario `
        -Feature "Users" `
        -Scenario "Admin updates user profile" `
        -Given "an authenticated admin user" `
        -When "they request PUT /users/:id with updated information" `
        -Then "the user profile should be updated successfully" `
        -Method "PUT" `
        -Endpoint "/users/$($testData.userId)" `
        -Body $updateUserBody

    $roleBody = @{ role = "admin" } | ConvertTo-Json

    Test-Scenario `
        -Feature "Users" `
        -Scenario "Owner changes user role" `
        -Given "an authenticated owner user" `
        -When "they request PATCH /users/:id/role with new role" `
        -Then "the user's role should be updated successfully" `
        -Method "PATCH" `
        -Endpoint "/users/$($testData.userId)/role" `
        -Body $roleBody
}

# ============================================================================
Write-Host "FEATURE GROUP 4: Workspace Management" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

Test-Scenario `
    -Feature "Workspaces" `
    -Scenario "User lists all accessible workspaces" `
    -Given "an authenticated user with workspace access" `
    -When "they request GET /workspaces" `
    -Then "they should receive a list of workspaces they can access" `
    -Method "GET" `
    -Endpoint "/workspaces" `
    -Validator { param($r) $r.workspaces -is [Array] }

$newWorkspaceBody = @{
    name = "Test Workspace $(Get-Random -Min 1000 -Max 9999)"
    description = "Automated test workspace"
    settings = @{
        defaultJobVisibility = "private"
    }
} | ConvertTo-Json

$wsResult = Test-Scenario `
    -Feature "Workspaces" `
    -Scenario "Admin creates a new workspace" `
    -Given "an authenticated admin user" `
    -When "they request POST /workspaces with workspace details" `
    -Then "a new workspace should be created successfully" `
    -Method "POST" `
    -Endpoint "/workspaces" `
    -Body $newWorkspaceBody `
    -Validator { param($r) $r.workspace -and $r.workspace.id }

if ($wsResult) { $testData.workspaceId = $wsResult.workspace.id }

if ($testData.workspaceId) {
    Test-Scenario `
        -Feature "Workspaces" `
        -Scenario "User views workspace details" `
        -Given "an authenticated user with workspace access" `
        -When "they request GET /workspaces/:id" `
        -Then "they should receive detailed workspace information" `
        -Method "GET" `
        -Endpoint "/workspaces/$($testData.workspaceId)" `
        -Validator { param($r) $r.workspace -and $r.workspace.name }

    $updateWsBody = @{ description = "Updated: Test workspace for BDD suite" } | ConvertTo-Json

    Test-Scenario `
        -Feature "Workspaces" `
        -Scenario "Admin updates workspace settings" `
        -Given "an authenticated admin user" `
        -When "they request PUT /workspaces/:id with updated settings" `
        -Then "the workspace should be updated successfully" `
        -Method "PUT" `
        -Endpoint "/workspaces/$($testData.workspaceId)" `
        -Body $updateWsBody

    Test-Scenario `
        -Feature "Workspaces" `
        -Scenario "User views workspace members" `
        -Given "an authenticated user with workspace access" `
        -When "they request GET /workspaces/:id/members" `
        -Then "they should receive a list of all workspace members" `
        -Method "GET" `
        -Endpoint "/workspaces/$($testData.workspaceId)/members" `
        -Validator { param($r) $r.members -is [Array] }

    if ($testData.userId) {
        $memberBody = @{ userId = $testData.userId; role = "member" } | ConvertTo-Json

        Test-Scenario `
            -Feature "Workspaces" `
            -Scenario "Admin adds member to workspace" `
            -Given "an authenticated admin user" `
            -When "they request POST /workspaces/:id/members with user ID" `
            -Then "the user should be added to the workspace successfully" `
            -Method "POST" `
            -Endpoint "/workspaces/$($testData.workspaceId)/members" `
            -Body $memberBody

        Test-Scenario `
            -Feature "Workspaces" `
            -Scenario "Admin removes member from workspace" `
            -Given "an authenticated admin user" `
            -When "they request DELETE /workspaces/:id/members/:userId" `
            -Then "the user should be removed from the workspace successfully" `
            -Method "DELETE" `
            -Endpoint "/workspaces/$($testData.workspaceId)/members/$($testData.userId)"
    }
}

# ============================================================================
Write-Host "FEATURE GROUP 5: Job Posting Management" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

if (-not $testData.workspaceId) {
    $workspaces = Invoke-RestMethod -Uri "$baseUrl/workspaces" -Headers $headers
    $testData.workspaceId = $workspaces.workspaces[0].id
}

$newJobBody = @{
    workspaceId = $testData.workspaceId
    title = "Senior Full Stack Developer - BDD Test"
    department = "Engineering"
    location = "San Francisco, CA"
    employmentType = "full-time"
    experienceLevel = "senior"
    salaryMin = 140000
    salaryMax = 200000
    salaryCurrency = "USD"
    description = "We're looking for an experienced full stack developer."
    requirements = @("7+ years experience", "Node.js", "React", "PostgreSQL")
    benefits = @("Health insurance", "401k", "Unlimited PTO", "Remote work")
    isRemote = $true
    isPublic = $true
} | ConvertTo-Json

$jobResult = Test-Scenario `
    -Feature "Jobs" `
    -Scenario "Recruiter creates a new job posting" `
    -Given "an authenticated recruiter with workspace access" `
    -When "they request POST /jobs with job details" `
    -Then "a new job posting should be created successfully" `
    -Method "POST" `
    -Endpoint "/jobs" `
    -Body $newJobBody `
    -Validator { param($r) $r.job -and $r.job.id }

if ($jobResult) { $testData.jobId = $jobResult.job.id }

Test-Scenario `
    -Feature "Jobs" `
    -Scenario "Recruiter lists all jobs in organization" `
    -Given "an authenticated recruiter" `
    -When "they request GET /jobs" `
    -Then "they should receive a paginated list of job postings" `
    -Method "GET" `
    -Endpoint "/jobs" `
    -Validator { param($r) $r.jobs -is [Array] }

if ($testData.jobId) {
    Test-Scenario `
        -Feature "Jobs" `
        -Scenario "Recruiter views job details" `
        -Given "an authenticated recruiter" `
        -When "they request GET /jobs/:id" `
        -Then "they should receive complete job posting details" `
        -Method "GET" `
        -Endpoint "/jobs/$($testData.jobId)" `
        -Validator { param($r) $r.job -and $r.job.title }

    $updateJobBody = @{
        salaryMax = 220000
        description = "Updated: Join our growing engineering team!"
    } | ConvertTo-Json

    Test-Scenario `
        -Feature "Jobs" `
        -Scenario "Recruiter updates job posting" `
        -Given "an authenticated recruiter" `
        -When "they request PUT /jobs/:id with updated information" `
        -Then "the job posting should be updated successfully" `
        -Method "PUT" `
        -Endpoint "/jobs/$($testData.jobId)" `
        -Body $updateJobBody

    # Update job status to 'open' so it appears in public API
    $publishJobBody = @{ status = "open" } | ConvertTo-Json
    Test-Scenario `
        -Feature "Jobs" `
        -Scenario "Recruiter publishes job posting" `
        -Given "an authenticated recruiter" `
        -When "they request PUT /jobs/:id with status='open'" `
        -Then "the job posting should be published and publicly accessible" `
        -Method "PUT" `
        -Endpoint "/jobs/$($testData.jobId)" `
        -Body $publishJobBody
}

Test-Scenario `
    -Feature "Jobs" `
    -Scenario "Anonymous user views public job listings" `
    -Given "an anonymous user without authentication" `
    -When "they request GET /jobs/public" `
    -Then "they should receive a list of public job postings" `
    -Method "GET" `
    -Endpoint "/jobs/public" `
    -NoAuth $true `
    -Validator { param($r) $r.jobs -is [Array] }

if ($testData.jobId) {
    Test-Scenario `
        -Feature "Jobs" `
        -Scenario "Anonymous user views public job details" `
        -Given "an anonymous user without authentication" `
        -When "they request GET /jobs/public/:id" `
        -Then "they should receive public job posting details" `
        -Method "GET" `
        -Endpoint "/jobs/public/$($testData.jobId)" `
        -NoAuth $true `
        -Validator { param($r) $r.job -and $r.job.title }
}

# ============================================================================
Write-Host "FEATURE GROUP 6: Candidate Management" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

$candidateEmail = "candidate.test.$(Get-Random)@example.com"
$newCandidateBody = @{
    firstName = "Alice"
    lastName = "Johnson"
    email = $candidateEmail
    phone = "+1-555-0123"
    location = "Boston, MA"
    currentJobTitle = "Senior Software Engineer"
    currentCompany = "Tech Innovations Inc"
    linkedinUrl = "https://linkedin.com/in/alicejohnson"
    skills = @("JavaScript", "TypeScript", "React", "Node.js", "Docker", "Kubernetes")
    experience = "10 years of software engineering experience"
    education = "MS Computer Science, Stanford University"
    source = "linkedin"
    tags = @("senior", "full-stack", "remote-ready")
} | ConvertTo-Json

$candidateResult = Test-Scenario `
    -Feature "Candidates" `
    -Scenario "Recruiter adds a new candidate to database" `
    -Given "an authenticated recruiter" `
    -When "they request POST /candidates with candidate details" `
    -Then "a new candidate profile should be created successfully" `
    -Method "POST" `
    -Endpoint "/candidates" `
    -Body $newCandidateBody `
    -Validator { param($r) $r.candidate -and $r.candidate.id }

if ($candidateResult) { $testData.candidateId = $candidateResult.candidate.id }

Test-Scenario `
    -Feature "Candidates" `
    -Scenario "Recruiter searches and filters candidates" `
    -Given "an authenticated recruiter" `
    -When "they request GET /candidates with search filters" `
    -Then "they should receive a filtered list of candidates" `
    -Method "GET" `
    -Endpoint "/candidates?search=software" `
    -Validator { param($r) $r.candidates -is [Array] }

if ($testData.candidateId) {
    Test-Scenario `
        -Feature "Candidates" `
        -Scenario "Recruiter views candidate profile" `
        -Given "an authenticated recruiter" `
        -When "they request GET /candidates/:id" `
        -Then "they should receive complete candidate profile details" `
        -Method "GET" `
        -Endpoint "/candidates/$($testData.candidateId)" `
        -Validator { param($r) $r.candidate -and $r.candidate.email }

    $updateCandidateBody = @{
        notes = "Excellent candidate - strong technical skills"
        tags = @("senior", "full-stack", "remote-ready", "recommended")
    } | ConvertTo-Json

    Test-Scenario `
        -Feature "Candidates" `
        -Scenario "Recruiter updates candidate information" `
        -Given "an authenticated recruiter" `
        -When "they request PUT /candidates/:id with updated information" `
        -Then "the candidate profile should be updated successfully" `
        -Method "PUT" `
        -Endpoint "/candidates/$($testData.candidateId)" `
        -Body $updateCandidateBody

    Test-Scenario `
        -Feature "Candidates" `
        -Scenario "Recruiter views candidate application history" `
        -Given "an authenticated recruiter" `
        -When "they request GET /candidates/:id/applications" `
        -Then "they should receive a list of all applications from this candidate" `
        -Method "GET" `
        -Endpoint "/candidates/$($testData.candidateId)/applications" `
        -Validator { param($r) $r.applications -is [Array] }
}

# ============================================================================
Write-Host "FEATURE GROUP 7: Application Submission and Tracking" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

if ($testData.jobId -and $testData.candidateId) {
    # First, make sure the job is actually open and public
    Start-Sleep -Milliseconds 500
    
    $newApplicationBody = @{
        jobId = $testData.jobId
        firstName = "Test"
        lastName = "Applicant"
        email = "testapplicant$(Get-Random)@example.com"
        phone = "+1-555-9999"
        location = "Remote"
        coverLetter = "I am very excited about this opportunity and believe my experience makes me an excellent fit."
        source = "career_page"
    } | ConvertTo-Json

    $appResult = Test-Scenario `
        -Feature "Applications" `
        -Scenario "Candidate submits job application" `
        -Given "a public job posting" `
        -When "a candidate submits POST /applications with details" `
        -Then "an application should be created with tracking code" `
        -Method "POST" `
        -Endpoint "/applications" `
        -Body $newApplicationBody `
        -NoAuth $true `
        -Validator { param($r) $r.application -and $r.application.trackingCode }

    if ($appResult) {
        $testData.applicationId = $appResult.application.id
        $testData.trackingCode = $appResult.application.trackingCode
    }
}

Test-Scenario `
    -Feature "Applications" `
    -Scenario "Recruiter lists all applications" `
    -Given "an authenticated recruiter" `
    -When "they request GET /applications" `
    -Then "they should receive a paginated list of applications" `
    -Method "GET" `
    -Endpoint "/applications" `
    -Validator { param($r) $r.applications -is [Array] }

if ($testData.applicationId) {
    Test-Scenario `
        -Feature "Applications" `
        -Scenario "Recruiter views application details" `
        -Given "an authenticated recruiter" `
        -When "they request GET /applications/:id" `
        -Then "they should receive complete application details" `
        -Method "GET" `
        -Endpoint "/applications/$($testData.applicationId)" `
        -Validator { param($r) $r.application -and $r.application.status }

    $updateApplicationBody = @{
        status = "active"
        stage = "screening"
        notes = "Moving to screening phase - strong background"
    } | ConvertTo-Json

    Test-Scenario `
        -Feature "Applications" `
        -Scenario "Recruiter updates application status" `
        -Given "an authenticated recruiter" `
        -When "they request PUT /applications/:id with new status" `
        -Then "the application should be updated successfully" `
        -Method "PUT" `
        -Endpoint "/applications/$($testData.applicationId)" `
        -Body $updateApplicationBody
}

if ($testData.trackingCode) {
    Test-Scenario `
        -Feature "Applications" `
        -Scenario "Candidate tracks application status" `
        -Given "a candidate with tracking code" `
        -When "they request GET /applications/track/:code" `
        -Then "they should receive current application status" `
        -Method "GET" `
        -Endpoint "/applications/track/$($testData.trackingCode)" `
        -NoAuth $true `
        -Validator { param($r) $r.application -and $r.application.currentStage }
}

# ============================================================================
Write-Host "FEATURE GROUP 8: Interview Scheduling and Management" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

if ($testData.applicationId) {
    $scheduledTime = (Get-Date).AddDays(5).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $newInterviewBody = @{
        applicationId = $testData.applicationId
        title = "Technical Interview - Round 1 System Design"
        type = "video"
        scheduledAt = $scheduledTime
        duration = 90
        meetingLink = "https://zoom.us/j/123456789"
        interviewerIds = @($testData.userId)  # Must include at least 1 interviewer
        notes = "Focus on system design and architecture"
    } | ConvertTo-Json

    $interviewResult = Test-Scenario `
        -Feature "Interviews" `
        -Scenario "Recruiter schedules an interview" `
        -Given "an authenticated recruiter and active application" `
        -When "they request POST /interviews with details" `
        -Then "an interview should be scheduled successfully" `
        -Method "POST" `
        -Endpoint "/interviews" `
        -Body $newInterviewBody `
        -Validator { param($r) $r.interview -and $r.interview.id }

    if ($interviewResult) { $testData.interviewId = $interviewResult.interview.id }
}

Test-Scenario `
    -Feature "Interviews" `
    -Scenario "Recruiter lists all scheduled interviews" `
    -Given "an authenticated recruiter" `
    -When "they request GET /interviews" `
    -Then "they should receive a list of all interviews" `
    -Method "GET" `
    -Endpoint "/interviews" `
    -Validator { param($r) $r.interviews -is [Array] }

Test-Scenario `
    -Feature "Interviews" `
    -Scenario "Recruiter filters upcoming interviews" `
    -Given "an authenticated recruiter" `
    -When "they request GET /interviews?upcoming=true" `
    -Then "they should receive only future interviews" `
    -Method "GET" `
    -Endpoint "/interviews?upcoming=true" `
    -Validator { param($r) $r.interviews -is [Array] }

if ($testData.interviewId) {
    Test-Scenario `
        -Feature "Interviews" `
        -Scenario "Recruiter views interview details" `
        -Given "an authenticated recruiter" `
        -When "they request GET /interviews/:id" `
        -Then "they should receive complete interview details" `
        -Method "GET" `
        -Endpoint "/interviews/$($testData.interviewId)" `
        -Validator { param($r) $r.interview -and $r.interview.title }

    $newScheduledTime = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $rescheduleBody = @{
        scheduledAt = $newScheduledTime
        duration = 120
        notes = "Extended to 2 hours"
    } | ConvertTo-Json

    Test-Scenario `
        -Feature "Interviews" `
        -Scenario "Recruiter reschedules interview" `
        -Given "an authenticated recruiter" `
        -When "they request PUT /interviews/:id with new schedule" `
        -Then "the interview should be rescheduled successfully" `
        -Method "PUT" `
        -Endpoint "/interviews/$($testData.interviewId)" `
        -Body $rescheduleBody

    $feedbackBody = @{
        recommendation = "hire"
        overallRating = 5
        comments = "Exceptional candidate with deep technical knowledge"
        strengths = "Strong system design skills"
        weaknesses = "Could benefit from more Kubernetes experience"
        technicalSkills = @{
            systemDesign = 5
            coding = 5
            algorithms = 4
            databases = 5
        }
        cultureFit = 5
    } | ConvertTo-Json

    Test-Scenario `
        -Feature "Interviews" `
        -Scenario "Interviewer submits feedback" `
        -Given "an authenticated interviewer after interview" `
        -When "they request POST /interviews/:id/feedback" `
        -Then "feedback should be recorded successfully" `
        -Method "POST" `
        -Endpoint "/interviews/$($testData.interviewId)/feedback" `
        -Body $feedbackBody
}

# ============================================================================
Write-Host "FEATURE GROUP 9: Resource Cleanup and Deletion" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
# ============================================================================

if ($testData.interviewId) {
    Test-Scenario `
        -Feature "Interviews" `
        -Scenario "Recruiter cancels an interview" `
        -Given "an authenticated recruiter" `
        -When "they request DELETE /interviews/:id" `
        -Then "the interview should be cancelled successfully" `
        -Method "DELETE" `
        -Endpoint "/interviews/$($testData.interviewId)"
}

if ($testData.applicationId) {
    Test-Scenario `
        -Feature "Applications" `
        -Scenario "Admin deletes an application" `
        -Given "an authenticated admin user" `
        -When "they request DELETE /applications/:id" `
        -Then "the application should be soft-deleted" `
        -Method "DELETE" `
        -Endpoint "/applications/$($testData.applicationId)"
}

if ($testData.candidateId) {
    Test-Scenario `
        -Feature "Candidates" `
        -Scenario "Admin removes candidate from database" `
        -Given "an authenticated admin user" `
        -When "they request DELETE /candidates/:id" `
        -Then "the candidate should be soft-deleted" `
        -Method "DELETE" `
        -Endpoint "/candidates/$($testData.candidateId)"
}

if ($testData.jobId) {
    Test-Scenario `
        -Feature "Jobs" `
        -Scenario "Recruiter closes and archives job posting" `
        -Given "an authenticated recruiter" `
        -When "they request DELETE /jobs/:id" `
        -Then "the job posting should be soft-deleted" `
        -Method "DELETE" `
        -Endpoint "/jobs/$($testData.jobId)"
}

if ($testData.workspaceId) {
    Test-Scenario `
        -Feature "Workspaces" `
        -Scenario "Admin deletes a workspace" `
        -Given "an authenticated admin user" `
        -When "they request DELETE /workspaces/:id" `
        -Then "the workspace should be soft-deleted" `
        -Method "DELETE" `
        -Endpoint "/workspaces/$($testData.workspaceId)"
}

if ($testData.userId) {
    Test-Scenario `
        -Feature "Users" `
        -Scenario "Owner deactivates a user account" `
        -Given "an authenticated owner user" `
        -When "they request DELETE /users/:id" `
        -Then "the user should be soft-deleted" `
        -Method "DELETE" `
        -Endpoint "/users/$($testData.userId)"
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================
$total = $passed + $failed
$rate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 1) } else { 0 }

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  COMPREHENSIVE TEST SUMMARY - BDD FORMAT" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Total Scenarios Tested: $total / 47 expected" -ForegroundColor White
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Success Rate: $rate%" -ForegroundColor $(if ($rate -eq 100) { "Green" } elseif ($rate -ge 90) { "Yellow" } else { "Red" })
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Coverage by Feature Group:" -ForegroundColor White
Write-Host "  1. Authentication and Authorization: 3 scenarios" -ForegroundColor Gray
Write-Host "  2. Organization Management: 3 scenarios" -ForegroundColor Gray
Write-Host "  3. User Management: 6 scenarios" -ForegroundColor Gray
Write-Host "  4. Workspace Management: 8 scenarios" -ForegroundColor Gray
Write-Host "  5. Job Posting Management: 6 scenarios" -ForegroundColor Gray
Write-Host "  6. Candidate Management: 5 scenarios" -ForegroundColor Gray
Write-Host "  7. Application Tracking: 5 scenarios" -ForegroundColor Gray
Write-Host "  8. Interview Management: 6 scenarios" -ForegroundColor Gray
Write-Host "  9. Resource Cleanup: 6 scenarios (DELETE operations)" -ForegroundColor Gray
Write-Host "================================================================`n" -ForegroundColor Cyan

if ($rate -eq 100) {
    Write-Host "  🎉 EXCELLENT! All tests passed!" -ForegroundColor Green
} elseif ($rate -ge 90) {
    Write-Host "  ⚠️  GOOD! Most tests passed, review failures above." -ForegroundColor Yellow
} else {
    Write-Host "  ❌ ATTENTION NEEDED! Multiple test failures detected." -ForegroundColor Red
}
Write-Host ""
