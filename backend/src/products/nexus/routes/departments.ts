import express, { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';

const router: Router = express.Router();

/**
 * @route   GET /api/products/nexus/departments
 * @desc    Get all departments for organization
 * @access  Private
 */
router.get('/', authenticate, getDepartments);

/**
 * @route   GET /api/products/nexus/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
router.get('/:id', authenticate, getDepartment);

/**
 * @route   POST /api/products/nexus/departments
 * @desc    Create new department
 * @access  Private (Admin/Manager)
 */
router.post('/', authenticate, createDepartment);

/**
 * @route   PATCH /api/products/nexus/departments/:id
 * @desc    Update department
 * @access  Private (Admin/Manager)
 */
router.patch('/:id', authenticate, updateDepartment);

/**
 * @route   DELETE /api/products/nexus/departments/:id
 * @desc    Delete department (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, deleteDepartment);

export default router;
