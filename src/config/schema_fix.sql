
-- Additional constraints and indexes for CleanAceh Database
-- Run this AFTER the main schema.sql

-- Add unique constraints that were missing
ALTER TABLE user_addresses 
ADD CONSTRAINT unique_user_address_label UNIQUE (user_id, label);

ALTER TABLE payment_methods 
ADD CONSTRAINT unique_user_payment_provider UNIQUE (user_id, provider);

ALTER TABLE cleaner_schedules 
ADD CONSTRAINT unique_cleaner_day_schedule UNIQUE (cleaner_id, day_of_week);

-- Ensure cleaner_profiles has unique constraint on user_id (should already exist)
-- This is just to make sure
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_cleaner_user' 
        AND table_name = 'cleaner_profiles'
    ) THEN
        ALTER TABLE cleaner_profiles 
        ADD CONSTRAINT unique_cleaner_user UNIQUE (user_id);
    END IF;
END $$;