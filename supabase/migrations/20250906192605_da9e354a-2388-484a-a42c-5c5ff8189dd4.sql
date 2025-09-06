-- Enable leaked password protection for better security
-- This requires updating the auth configuration
UPDATE auth.config 
SET value = 'true' 
WHERE parameter = 'enable_leaked_password_protection';