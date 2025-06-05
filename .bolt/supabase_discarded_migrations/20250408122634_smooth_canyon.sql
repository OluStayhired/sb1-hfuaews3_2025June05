/*
  # Create social channels table

  1. New Tables
    - `social_channels`
      - `id` (uuid, primary key)
      - `handle` (text, unique with account_owner)
      - `display_name` (text)
      - `avatar_url` (text)
      - `last_login` (timestamp)
      - `app_password` (text, encrypted)
      - `remember_me` (boolean)
      - `account_owner` (text, references auth.users.email)
      - `social_channel` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `social_channels` table
    - Add policies for authenticated users to manage their own channels
*/

CREATE TABLE IF NOT EXISTS social_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  display_name text,
  avatar_url text,
  last_login timestamptz,
  app_password text,
  remember_me boolean DEFAULT false,
  email text NOT NULL REFERENCES auth.users(email),
  social_channel text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(handle, email)
);

ALTER TABLE social_channels ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own channels
CREATE POLICY "Users can read own channels"
  ON social_channels
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = email);

-- Allow users to insert their own channels
CREATE POLICY "Users can insert own channels"
  ON social_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Allow users to update their own channels
CREATE POLICY "Users can update own channels"
  ON social_channels
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = email);

-- Allow users to delete their own channels
CREATE POLICY "Users can delete own channels"
  ON social_channels
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = email);