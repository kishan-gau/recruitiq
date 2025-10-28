/**
 * RecruitIQ Pre-Action Check Integration Example
 * 
 * This demonstrates how RecruitIQ instances should integrate with the
 * License Manager to enforce tier limits BEFORE creating resources.
 */

// ============================================================================
// Configuration
// ============================================================================

const LICENSE_MANAGER_URL = process.env.LICENSE_MANAGER_URL || 'https://license.recruitiq.com'
const INSTANCE_KEY = process.env.INSTANCE_KEY // Unique instance identifier

// ============================================================================
// License Client Service
// ============================================================================

class LicenseClient {
  constructor(instanceKey, licenseManagerUrl) {
    this.instanceKey = instanceKey
    this.baseUrl = licenseManagerUrl
  }

  /**
   * Check if we can create a new resource (PRE-ACTION CHECK)
   * Call this BEFORE creating users, workspaces, jobs, or candidates
   */
  async checkLimit(resourceType, currentCount) {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate/check-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceKey: this.instanceKey,
          resourceType, // 'users', 'workspaces', 'jobs', 'candidates'
          currentCount
        })
      })

      const result = await response.json()

      return result
    } catch (error) {
      console.error('License check failed:', error)
      // In case of error, allow operation but log for investigation
      return { 
        allowed: true, 
        error: 'License check unavailable',
        warning: true
      }
    }
  }

  /**
   * Validate license on application startup
   */
  async validateLicense(licenseKey) {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey,
          instanceKey: this.instanceKey
        })
      })

      return await response.json()
    } catch (error) {
      console.error('License validation failed:', error)
      throw new Error('Unable to validate license')
    }
  }

  /**
   * Check if a feature is available
   */
  async hasFeature(featureName) {
    // Implementation depends on how you store customer ID in RecruitIQ
    // You may need to cache this from the license validation response
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

const licenseClient = new LicenseClient(INSTANCE_KEY, LICENSE_MANAGER_URL)

// ----------------------------------------------------------------------------
// Example 1: Creating a New User
// ----------------------------------------------------------------------------

async function createUser(userData) {
  try {
    // Get current user count
    const currentUsers = await User.count()

    // PRE-ACTION CHECK
    const limitCheck = await licenseClient.checkLimit('users', currentUsers)

    if (!limitCheck.allowed) {
      // Limit exceeded - return error with upgrade suggestion
      throw new Error({
        code: 'LICENSE_LIMIT_EXCEEDED',
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        upgradeSuggestion: limitCheck.upgradeSuggestion
      })
    }

    // Limit OK - proceed with user creation
    const user = await User.create(userData)
    
    return user
  } catch (error) {
    if (error.code === 'LICENSE_LIMIT_EXCEEDED') {
      // Show upgrade modal to user
      return {
        error: true,
        message: error.message,
        upgradeSuggestion: error.upgradeSuggestion
      }
    }
    throw error
  }
}

// ----------------------------------------------------------------------------
// Example 2: Creating a New Workspace
// ----------------------------------------------------------------------------

async function createWorkspace(workspaceData) {
  const currentWorkspaces = await Workspace.count()
  
  const limitCheck = await licenseClient.checkLimit('workspaces', currentWorkspaces)

  if (!limitCheck.allowed) {
    return {
      success: false,
      error: limitCheck.message,
      limit: limitCheck.limit,
      current: limitCheck.current,
      tier: limitCheck.tier,
      upgradePath: limitCheck.upgradeSuggestion
    }
  }

  const workspace = await Workspace.create(workspaceData)
  return { success: true, workspace }
}

// ----------------------------------------------------------------------------
// Example 3: React Component with Limit Checking
// ----------------------------------------------------------------------------

/**
 * AddUserModal Component
 */
function AddUserModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [limitError, setLimitError] = useState(null)

  const handleAddUser = async (userData) => {
    setLoading(true)
    setLimitError(null)

    try {
      const result = await createUser(userData)

      if (result.error && result.upgradeSuggestion) {
        // Show upgrade modal instead
        setLimitError(result)
        setShowUpgradeModal(true)
      } else {
        onSuccess(result)
        onClose()
      }
    } catch (error) {
      console.error('Failed to create user:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Add New User</h2>
      
      {limitError && (
        <Alert type="error">
          <p>{limitError.message}</p>
          <Button onClick={() => setShowUpgradeModal(true)}>
            {limitError.upgradeSuggestion?.ctaText || 'Upgrade Plan'}
          </Button>
        </Alert>
      )}

      {/* User form fields */}
    </Modal>
  )
}

// ----------------------------------------------------------------------------
// Example 4: Middleware for Express Routes
// ----------------------------------------------------------------------------

/**
 * Middleware to check license limits before resource creation
 */
function checkLicenseLimit(resourceType) {
  return async (req, res, next) => {
    try {
      // Get current count for this resource type
      const Model = {
        'users': User,
        'workspaces': Workspace,
        'jobs': Job,
        'candidates': Candidate
      }[resourceType]

      const currentCount = await Model.count()

      // Check limit
      const limitCheck = await licenseClient.checkLimit(resourceType, currentCount)

      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: 'License limit exceeded',
          message: limitCheck.message,
          limit: limitCheck.limit,
          current: limitCheck.current,
          remaining: limitCheck.remaining,
          tier: limitCheck.tier,
          upgradeSuggestion: limitCheck.upgradeSuggestion
        })
      }

      // Attach limit info to request for logging
      req.licenseCheck = limitCheck

      next()
    } catch (error) {
      console.error('License check middleware error:', error)
      // Allow operation to proceed if license check fails
      next()
    }
  }
}

// Usage in routes
app.post('/api/users', 
  checkLicenseLimit('users'),
  async (req, res) => {
    // Create user logic
  }
)

app.post('/api/workspaces',
  checkLicenseLimit('workspaces'),
  async (req, res) => {
    // Create workspace logic
  }
)

// ----------------------------------------------------------------------------
// Example 5: Bulk Operations with Limit Checking
// ----------------------------------------------------------------------------

async function bulkImportUsers(usersData) {
  const currentUsers = await User.count()
  const usersToImport = usersData.length

  // Check if bulk operation would exceed limit
  const limitCheck = await licenseClient.checkLimit('users', currentUsers + usersToImport)

  if (!limitCheck.allowed) {
    const canImport = limitCheck.limit - currentUsers
    
    return {
      success: false,
      message: `Cannot import ${usersToImport} users. Your plan allows ${limitCheck.limit} users total.`,
      current: currentUsers,
      limit: limitCheck.limit,
      canImport,
      suggestion: canImport > 0 
        ? `You can import ${canImport} more users on your current plan.`
        : 'Please upgrade to import more users.',
      upgradeSuggestion: limitCheck.upgradeSuggestion
    }
  }

  // Proceed with bulk import
  const importedUsers = await User.bulkCreate(usersData)
  
  return {
    success: true,
    imported: importedUsers.length
  }
}

// ----------------------------------------------------------------------------
// Example 6: Client-Side Prevention (Optional)
// ----------------------------------------------------------------------------

/**
 * Get current license status to disable/enable UI elements
 * Call this on dashboard load to show upgrade prompts proactively
 */
async function getLicenseStatus() {
  try {
    const response = await fetch(`/api/license/status`)
    const status = await response.json()

    // Example response:
    // {
    //   tier: 'starter',
    //   limits: {
    //     users: { max: 10, current: 9, remaining: 1, nearLimit: true },
    //     workspaces: { max: 1, current: 1, remaining: 0, exceeded: true },
    //     jobs: { max: 50, current: 35, remaining: 15 },
    //     candidates: { max: 500, current: 450, remaining: 50 }
    //   }
    // }

    return status
  } catch (error) {
    console.error('Failed to get license status:', error)
    return null
  }
}

// Use in React to show warnings
function DashboardHeader() {
  const [licenseStatus, setLicenseStatus] = useState(null)

  useEffect(() => {
    getLicenseStatus().then(setLicenseStatus)
  }, [])

  return (
    <div>
      {licenseStatus?.limits.users.nearLimit && (
        <Banner type="warning">
          You're almost at your user limit ({licenseStatus.limits.users.current}/{licenseStatus.limits.users.max}).
          <a href="/upgrade">Upgrade now</a>
        </Banner>
      )}
    </div>
  )
}

// ============================================================================
// Error Response Format
// ============================================================================

/**
 * When a limit is exceeded, the API returns:
 * 
 * {
 *   "allowed": false,
 *   "limit": 10,
 *   "current": 10,
 *   "remaining": 0,
 *   "resourceType": "users",
 *   "message": "You've reached your users limit (10/10).",
 *   "tier": "starter",
 *   "upgradeSuggestion": {
 *     "recommendedTier": "professional",
 *     "benefits": [
 *       "Up to 50 users",
 *       "5 workspaces",
 *       "Unlimited jobs",
 *       "5,000 candidates",
 *       "Advanced analytics",
 *       "API access"
 *     ],
 *     "ctaText": "Upgrade to Professional"
 *   }
 * }
 */

export { LicenseClient, checkLicenseLimit, getLicenseStatus }
