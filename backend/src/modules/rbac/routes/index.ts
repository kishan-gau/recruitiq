import express, { Router } from 'express';
import roleRoutes from './roleRoutes.ts';
import permissionRoutes from './permissionRoutes.ts';
import userRoleRoutes from './userRoleRoutes.ts';

const router: Router = express.Router();

// Mount sub-routes
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/user-roles', userRoleRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'RBAC API is operational'
  });
});

export default router;
