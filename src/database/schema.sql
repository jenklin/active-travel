-- Active Travel Database Schema
-- PostgreSQL schema for trip management and agent decisions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'planning',
  -- Status: planning, confirmed, in_progress, completed, cancelled

  -- Budget tracking
  budget_total DECIMAL(10, 2) NOT NULL,
  budget_spent DECIMAL(10, 2) DEFAULT 0,
  budget_currency VARCHAR(3) DEFAULT 'USD',

  -- Budget categories (JSONB for flexibility)
  budget_categories JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT trips_status_check CHECK (status IN ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);

-- Travelers table (many-to-many with trips)
CREATE TABLE travelers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  wellness_profile_id VARCHAR(255), -- Links to CarePeers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_travelers_trip_id ON travelers(trip_id);
CREATE INDEX idx_travelers_wellness_profile_id ON travelers(wellness_profile_id);

-- Daily itineraries
CREATE TABLE daily_itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  location VARCHAR(255) NOT NULL,

  -- Intent and metrics
  primary_intent VARCHAR(50) NOT NULL,
  -- Intent: golf, recovery, culture, transit, free
  energy_level VARCHAR(20), -- low, medium, high
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),

  -- Schedule (JSONB for flexibility)
  schedule JSONB,

  -- Health tracking
  health_data JSONB,

  -- Spending
  spend_planned DECIMAL(10, 2),
  spend_actual DECIMAL(10, 2) DEFAULT 0,

  -- Agent notes and adjustments
  agent_notes TEXT,
  adjustments JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(trip_id, date)
);

CREATE INDEX idx_daily_itineraries_trip_id ON daily_itineraries(trip_id);
CREATE INDEX idx_daily_itineraries_date ON daily_itineraries(date);
CREATE INDEX idx_daily_itineraries_intent ON daily_itineraries(primary_intent);

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_id UUID REFERENCES daily_itineraries(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Activity details
  type VARCHAR(50) NOT NULL,
  -- Type: golf, cultural, dining, wellness, transport, free
  name VARCHAR(500) NOT NULL,

  -- Location (JSONB for structured data)
  location JSONB,

  -- Timing
  timing JSONB,

  -- Physical load
  physical_load VARCHAR(20) CHECK (physical_load IN ('low', 'medium', 'high')),

  -- Status
  status VARCHAR(50) DEFAULT 'planned',
  -- Status: planned, confirmed, in_progress, completed, cancelled

  -- Booking info
  booking JSONB,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_trip_id ON activities(trip_id);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_status ON activities(status);

-- Golf rounds (specialized activity)
CREATE TABLE golf_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  -- Course details (JSONB)
  course JSONB,

  tee_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Inclusions
  includes JSONB,

  -- Costs
  costs JSONB,

  -- Weather
  weather JSONB,

  -- Completion
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_golf_rounds_activity_id ON golf_rounds(activity_id);
CREATE INDEX idx_golf_rounds_tee_time ON golf_rounds(tee_time);

-- Transport segments
CREATE TABLE transport_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
  -- Type: flight, train, private_car, taxi

  -- From/To (JSONB)
  from_location JSONB,
  to_location JSONB,

  departure TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Booking
  booking JSONB,

  status VARCHAR(50) DEFAULT 'planned',
  -- Status: planned, booked, completed, cancelled

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transport_segments_trip_id ON transport_segments(trip_id);
CREATE INDEX idx_transport_segments_departure ON transport_segments(departure);

-- Accommodations
CREATE TABLE accommodations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  hotel_name VARCHAR(500) NOT NULL,
  city VARCHAR(255) NOT NULL,

  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,

  room_type VARCHAR(255),

  -- Booking
  booking JSONB,

  status VARCHAR(50) DEFAULT 'planned',
  -- Status: planned, booked, checked_in, checked_out, cancelled

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accommodations_trip_id ON accommodations(trip_id);
CREATE INDEX idx_accommodations_dates ON accommodations(check_in, check_out);

-- ============================================================================
-- WELLNESS INTEGRATION
-- ============================================================================

-- Wellness profiles (cached from CarePeers MCP)
CREATE TABLE wellness_profiles (
  user_id VARCHAR(255) PRIMARY KEY,

  who5_score INTEGER CHECK (who5_score BETWEEN 0 AND 100),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  energy_level VARCHAR(20), -- low, medium, high
  steps_target INTEGER,

  dietary_restrictions TEXT[],
  medical_conditions TEXT[],
  mobility_level VARCHAR(20), -- full, moderate, limited
  medication_schedule JSONB,

  -- Metadata
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  carepeers_profile_id VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wellness_profiles_synced_at ON wellness_profiles(synced_at);

-- Daily feedback
CREATE TABLE daily_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,

  energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),

  physical_notes TEXT,
  emotional_notes TEXT,
  suggestions TEXT,

  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(trip_id, user_id, date)
);

CREATE INDEX idx_daily_feedback_trip_id ON daily_feedback(trip_id);
CREATE INDEX idx_daily_feedback_date ON daily_feedback(date);

-- ============================================================================
-- AGENT DECISIONS (Audit Trail)
-- ============================================================================

CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  agent_type VARCHAR(50) NOT NULL,
  -- Type: travel_experience, health_recovery, golf_operations, budget_control, transport_logistics, culture_dining

  decision TEXT NOT NULL,
  rationale TEXT NOT NULL,

  -- Input signals (JSONB)
  input_signals JSONB,

  -- Output actions
  output_actions JSONB,

  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Approval workflow
  approval_required BOOLEAN DEFAULT FALSE,
  approved BOOLEAN,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agent_decisions_trip_id ON agent_decisions(trip_id);
CREATE INDEX idx_agent_decisions_date ON agent_decisions(date);
CREATE INDEX idx_agent_decisions_agent_type ON agent_decisions(agent_type);
CREATE INDEX idx_agent_decisions_timestamp ON agent_decisions(timestamp);

-- ============================================================================
-- PREFERENCES
-- ============================================================================

CREATE TABLE travel_preferences (
  user_id VARCHAR(255) PRIMARY KEY,

  golf_frequency VARCHAR(20), -- daily, 3_per_week, 2_per_week, occasional
  walking_limit VARCHAR(20), -- unlimited, moderate, limited
  dining_style VARCHAR(50), -- fine_dining, local_authentic, casual, mixed
  mornings VARCHAR(20), -- early, preferred, late
  evenings VARCHAR(20), -- early, moderate, late

  -- Constraints (JSONB)
  constraints JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- EXPERIENCE LAB REGISTRATION
-- ============================================================================

CREATE TABLE lab_activations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  lab_id VARCHAR(255) NOT NULL DEFAULT 'active-living-lab',

  -- Activation details
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activation_route VARCHAR(255), -- How they found the lab

  -- User outcome/goal
  user_outcome TEXT,
  selected_importance INTEGER CHECK (selected_importance BETWEEN 1 AND 5),

  -- Session data
  session_data JSONB,

  -- Status
  completed BOOLEAN DEFAULT FALSE,
  launched BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lab_activations_user_id ON lab_activations(user_id);
CREATE INDEX idx_lab_activations_lab_id ON lab_activations(lab_id);
CREATE INDEX idx_lab_activations_activated_at ON lab_activations(activated_at);

-- ============================================================================
-- MCP SERVICE REGISTRY
-- ============================================================================

CREATE TABLE mcp_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name VARCHAR(255) NOT NULL UNIQUE,
  service_type VARCHAR(100), -- experience_lab, wellness_service, booking_provider, etc.

  -- MCP connection details
  mcp_url VARCHAR(500) NOT NULL,
  api_key_required BOOLEAN DEFAULT TRUE,

  -- Capabilities
  capabilities JSONB,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, deprecated
  last_health_check TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mcp_services_service_type ON mcp_services(service_type);
CREATE INDEX idx_mcp_services_status ON mcp_services(status);

-- Insert default CarePeers MCP service
INSERT INTO mcp_services (service_name, service_type, mcp_url, capabilities) VALUES
  ('carepeers', 'wellness_service', 'http://localhost:3001/mcp',
   '{"wellness_profile": true, "activity_recommendations": true, "wellness_logs": true}'::jsonb);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_itineraries_updated_at BEFORE UPDATE ON daily_itineraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_profiles_updated_at BEFORE UPDATE ON wellness_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Active trips with budget summary
CREATE VIEW active_trips_summary AS
SELECT
  t.id,
  t.user_id,
  t.name,
  t.start_date,
  t.end_date,
  t.status,
  t.budget_total,
  t.budget_spent,
  t.budget_currency,
  (t.budget_total - t.budget_spent) AS budget_remaining,
  ROUND((t.budget_spent / NULLIF(t.budget_total, 0) * 100), 2) AS percent_spent,
  COUNT(DISTINCT di.id) AS total_days,
  COUNT(DISTINCT a.id) AS total_activities
FROM trips t
LEFT JOIN daily_itineraries di ON t.id = di.trip_id
LEFT JOIN activities a ON t.id = a.trip_id
WHERE t.status IN ('planning', 'confirmed', 'in_progress')
GROUP BY t.id;

-- View: Recent agent decisions by trip
CREATE VIEW recent_agent_decisions AS
SELECT
  ad.id,
  ad.trip_id,
  ad.date,
  ad.agent_type,
  ad.decision,
  ad.rationale,
  ad.timestamp,
  ad.approval_required,
  ad.approved,
  t.name AS trip_name,
  t.user_id
FROM agent_decisions ad
JOIN trips t ON ad.trip_id = t.id
ORDER BY ad.timestamp DESC;

-- View: Wellness-constrained activities
CREATE VIEW wellness_integrated_activities AS
SELECT
  a.id,
  a.trip_id,
  a.date,
  a.name,
  a.type,
  a.physical_load,
  wp.energy_level,
  wp.mobility_level,
  wp.steps_target,
  df.energy_rating AS previous_day_energy,
  df.sleep_quality AS previous_day_sleep
FROM activities a
JOIN travelers tr ON a.trip_id = tr.trip_id
LEFT JOIN wellness_profiles wp ON tr.wellness_profile_id = wp.user_id
LEFT JOIN daily_feedback df ON a.trip_id = df.trip_id
  AND df.date = a.date - INTERVAL '1 day'
WHERE a.status IN ('planned', 'confirmed');
