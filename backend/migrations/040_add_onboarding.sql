ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

UPDATE users
SET onboarding_completed = false
WHERE onboarding_completed IS NULL;
