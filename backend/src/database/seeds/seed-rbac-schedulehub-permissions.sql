-- ============================================================================
-- Seed ScheduleHub (Scheduling) Product Permissions
-- ============================================================================
-- Description: Seeds permissions for ScheduleHub scheduling product
-- Run this AFTER platform RBAC migration
-- ============================================================================

-- ============================================================================
-- SCHEDULEHUB PRODUCT PERMISSIONS
-- ============================================================================
-- NOTE: Using 'scheduling:' prefix to match route permissions

INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
-- Schedule Management
('schedulehub', 'scheduling:schedules:create', 'Create Schedules', 'Create work schedules', 'schedules'),
('schedulehub', 'scheduling:schedules:read', 'View Schedules', 'View schedule information', 'schedules'),
('schedulehub', 'scheduling:schedules:publish', 'Publish Schedules', 'Publish schedules to workers', 'schedules'),

-- Shift Management
('schedulehub', 'scheduling:shifts:create', 'Create Shifts', 'Create shift assignments', 'shifts'),
('schedulehub', 'scheduling:shifts:read', 'View Shifts', 'View shift information', 'shifts'),
('schedulehub', 'scheduling:shifts:update', 'Update Shifts', 'Update shift assignments', 'shifts'),
('schedulehub', 'scheduling:shifts:delete', 'Delete Shifts', 'Cancel shift assignments', 'shifts'),
('schedulehub', 'scheduling:shifts:assign', 'Assign Shifts', 'Assign/unassign workers to shifts', 'shifts'),
('schedulehub', 'scheduling:shifts:clock', 'Clock In/Out', 'Clock in/out of shifts', 'shifts'),

-- Station Management
('schedulehub', 'scheduling:stations:create', 'Create Stations', 'Create work stations', 'stations'),
('schedulehub', 'scheduling:stations:read', 'View Stations', 'View station information and requirements', 'stations'),
('schedulehub', 'scheduling:stations:update', 'Update Stations', 'Update station information and requirements', 'stations'),

-- Worker Management
('schedulehub', 'scheduling:workers:create', 'Create Workers', 'Create worker profiles', 'workers'),
('schedulehub', 'scheduling:workers:read', 'View Workers', 'View worker information', 'workers'),
('schedulehub', 'scheduling:workers:update', 'Update Workers', 'Update worker profiles', 'workers'),
('schedulehub', 'scheduling:workers:delete', 'Delete Workers', 'Terminate worker profiles', 'workers'),

-- Availability Management
('schedulehub', 'scheduling:availability:create', 'Create Availability', 'Set worker availability and default schedules', 'availability'),
('schedulehub', 'scheduling:availability:read', 'View Availability', 'View worker availability and check availability', 'availability'),
('schedulehub', 'scheduling:availability:update', 'Update Availability', 'Update availability settings', 'availability'),
('schedulehub', 'scheduling:availability:delete', 'Delete Availability', 'Delete availability records', 'availability'),

-- Time-Off Management
('schedulehub', 'scheduling:time_off:create', 'Create Time-Off Requests', 'Create time-off requests', 'time_off'),
('schedulehub', 'scheduling:time_off:read', 'View Time-Off Requests', 'View time-off information', 'time_off'),
('schedulehub', 'scheduling:time_off:delete', 'Cancel Time-Off', 'Cancel time-off requests', 'time_off'),
('schedulehub', 'scheduling:time_off:approve', 'Approve Time-Off', 'Review and approve/reject time-off requests', 'time_off'),

-- Shift Swap Marketplace
('schedulehub', 'scheduling:shift_swaps:create', 'Create Swap Requests', 'Create shift swap offers and requests', 'shift_swaps'),
('schedulehub', 'scheduling:shift_swaps:read', 'View Swap Requests', 'View swap marketplace and offers', 'shift_swaps'),
('schedulehub', 'scheduling:shift_swaps:approve', 'Approve Swaps', 'Approve/accept shift swap requests', 'shift_swaps'),
('schedulehub', 'scheduling:shift_swaps:delete', 'Cancel Swaps', 'Cancel swap offers', 'shift_swaps'),

-- Role Management
('schedulehub', 'scheduling:roles:create', 'Create Roles', 'Create worker roles', 'roles'),
('schedulehub', 'scheduling:roles:read', 'View Roles', 'View role information and assignments', 'roles'),
('schedulehub', 'scheduling:roles:update', 'Update Roles', 'Update role information', 'roles'),
('schedulehub', 'scheduling:roles:assign', 'Assign Roles', 'Assign/remove workers from roles', 'roles'),

-- Statistics & Analytics
('schedulehub', 'scheduling:stats:read', 'View Statistics', 'View scheduling statistics and dashboard', 'stats')

ON CONFLICT (product, name) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] ScheduleHub permissions seeded successfully!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Total: 33 permissions (matching all route requirements)';
  RAISE NOTICE '';
  RAISE NOTICE 'Categories:';
  RAISE NOTICE '  - schedules (3 permissions)';
  RAISE NOTICE '  - shifts (6 permissions)';
  RAISE NOTICE '  - stations (3 permissions)';
  RAISE NOTICE '  - workers (4 permissions)';
  RAISE NOTICE '  - availability (4 permissions)';
  RAISE NOTICE '  - time_off (4 permissions)';
  RAISE NOTICE '  - shift_swaps (4 permissions)';
  RAISE NOTICE '  - roles (4 permissions)';
  RAISE NOTICE '  - stats (1 permission)';
  RAISE NOTICE '';
  RAISE NOTICE 'All permissions use "scheduling:" prefix to match routes';
  RAISE NOTICE '================================================================';
END;
$$;
