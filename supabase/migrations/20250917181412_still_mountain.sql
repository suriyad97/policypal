/*
  # Fix Gender Field Constraint
  
  1. Changes
    - Update gender column constraint to allow NULL values
    - Ensures optional gender data from frontend can be stored
  
  2. Security
    - Maintains data validation for non-null values
    - Allows NULL for optional demographic data
*/

-- Update the gender column constraint to allow NULL values
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS CK__customers__gender;

ALTER TABLE customers 
ADD CONSTRAINT CK__customers__gender 
CHECK (gender IS NULL OR gender IN ('male', 'female', 'non_binary'));