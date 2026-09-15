-- Mini-CRM Data-Major Ibérica
-- À exécuter dans la console SQL Neon si tu n’utilises pas drizzle-kit

CREATE TYPE candidate_status AS ENUM (
  'new',
  'proposed',
  'to_contact',
  'contacted',
  'replied',
  'interview',
  'offer',
  'hired',
  'rejected_by_us',
  'no_reply',
  'candidate_declined',
  'on_hold',
  'blacklisted',
  'too_expensive',
  'wrong_fit'
);

CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'viewer', 'agent');

CREATE TYPE event_type AS ENUM (
  'discovered',
  'proposed_in_digest',
  'status_changed',
  'contacted',
  'reply_received',
  'interview',
  'colleague_feedback',
  'note',
  'salary_update',
  'flag_added',
  'import'
);

CREATE TYPE actor_type AS ENUM ('human', 'agent', 'system');

CREATE TYPE source_first AS ENUM (
  'linkedin_search',
  'inbound_job_post',
  'referral',
  'manual',
  'other'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text UNIQUE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'recruiter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_url text NOT NULL UNIQUE,
  linkedin_slug text,
  full_name text NOT NULL,
  first_name text,
  last_name text,
  headline text,
  current_title text,
  current_company text,
  location_raw text,
  location_city text,
  location_country text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  french_client_ready boolean,
  salary_risk text,
  remote_flag text,
  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status candidate_status NOT NULL DEFAULT 'to_contact',
  do_not_propose boolean NOT NULL DEFAULT false,
  owner_user_id uuid REFERENCES users(id),
  source_first source_first NOT NULL DEFAULT 'manual',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_proposed_at timestamptz,
  last_contacted_at timestamptz,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX candidates_status_idx ON candidates(status);
CREATE INDEX candidates_owner_idx ON candidates(owner_user_id);

CREATE TABLE candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id),
  type event_type NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  actor_type actor_type NOT NULL DEFAULT 'human',
  actor_name text NOT NULL,
  actor_email text,
  from_status candidate_status,
  to_status candidate_status,
  channel text,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX candidate_events_candidate_idx ON candidate_events(candidate_id);
