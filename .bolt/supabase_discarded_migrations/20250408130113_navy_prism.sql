/*
  # Update social channels table structure

  1. Changes
    - Add user_id column referencing auth.users(id)
    - Keep email column for convenience
    - Update RLS policies to use user_id
    - Add foreign key constraint to auth.users

  2. Security
    - Update RLS policies to use auth.uid()
    - Maintain existing security model with additional user_id check
*/

-- First add the new user_id column
ALTER TABLE social_channels
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Update RLS policies to use user_id
DROP POLICY IF EXISTS "Users can read own channels" ON social_channels;
DROP POLICY IF EXISTS "Users can insert own channels" ON social_channels;
DROP POLICY IF EXISTS "Users can update own channels" ON social_channels;
DROP POLICY IF EXISTS "Users can delete own channels" ON social_channels;

-- Create new policies using both user_id and email
CREATE POLICY "Users can read own channels"
  ON social_channels
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    auth.jwt() ->> 'email' = email
  );

CREATE POLICY "Users can insert own channels"
  ON social_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND 
    auth.jwt() ->> 'email' = email
  );

CREATE POLICY "Users can update own channels"
  ON social_channels
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    auth.jwt() ->> 'email' = email
  );

CREATE POLICY "Users can delete own channels"
  ON social_channels
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    auth.jwt() ->> 'email' = email
  );