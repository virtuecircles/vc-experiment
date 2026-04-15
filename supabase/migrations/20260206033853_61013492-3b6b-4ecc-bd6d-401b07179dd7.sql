-- Phase 1a: Add new role enum values
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vc_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vc_guide';