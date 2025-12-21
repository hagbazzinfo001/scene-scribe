-- Enable leaked password protection for better security
-- NOTE: auth.config table doesn't exist in hosted Supabase
-- This configuration is managed through the Supabase dashboard instead
-- Commenting out to allow migration to proceed

-- UPDATE auth.config 
-- SET value = 'true' 
-- WHERE parameter = 'enable_leaked_password_protection';