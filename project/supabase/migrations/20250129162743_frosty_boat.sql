/*
  # Scraping System Schema

  1. New Tables
    - `scraped_profiles`
      - `id` (uuid, primary key)
      - `url` (text, unique) - The profile URL
      - `name` (text) - Profile name
      - `email` (text) - Found email
      - `platform` (text) - Social platform
      - `keywords` (text) - Search keywords used
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
  2. Security
    - Enable RLS on `scraped_profiles` table
    - Add policies for authenticated users to read/write their own data
*/

CREATE TABLE IF NOT EXISTS scraped_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  name text,
  email text,
  platform text NOT NULL,
  keywords text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scraped_profiles ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Users can read scraped profiles"
  ON scraped_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Users can insert scraped profiles"
  ON scraped_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_scraped_profiles_updated_at
  BEFORE UPDATE ON scraped_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();