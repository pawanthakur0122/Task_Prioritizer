/*
  # Create tasks table with AI prioritization support

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `due_date` (timestamptz)
      - `effort` (text)
      - `priority` (text)
      - `priority_score` (integer)
      - `status` (text)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for authenticated users to manage their own tasks
*/

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  effort text NOT NULL CHECK (effort IN ('SHORT', 'MEDIUM', 'LONG')),
  priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  priority_score integer NOT NULL CHECK (priority_score BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_priority_idx ON tasks(priority);
CREATE INDEX tasks_status_idx ON tasks(status);