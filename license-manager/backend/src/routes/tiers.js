import express from 'express'
import { tierController } from '../controllers/tierController.js'
import { authenticateAdmin } from '../middleware/auth.js'

const router = express.Router()

// All tier management routes require authentication
router.use(authenticateAdmin)

// Get all active tiers
router.get('/', tierController.getAllTiers)

// Get tier usage statistics
router.get('/stats', tierController.getTierStats)

// Get tier version history
router.get('/:tierName/history', tierController.getTierHistory)

// Compare two tier versions
router.get('/compare', tierController.compareTierVersions)

// Get customers using a specific preset
router.get('/preset/:presetId/customers', tierController.getPresetCustomers)

// Create new tier version
router.post('/create-version', tierController.createTierVersion)

// Preview migration impact
router.post('/:tierName/preview-migration', tierController.previewMigration)

// Get migration history
router.get('/migrations/history', tierController.getMigrationHistory)

// Execute migration
router.post('/migrations/:migrationId/execute', tierController.executeMigration)

export default router
