-- Migration: Make CRMV field optional in veterinarians table
-- Date: 2025-10-12
-- Description: Remove NOT NULL constraint from veterinarians.crmv to allow veterinarians without CRMV registration

ALTER TABLE veterinarians ALTER COLUMN crmv DROP NOT NULL;

-- This change has been applied to development environment
-- Apply this migration to other environments as needed