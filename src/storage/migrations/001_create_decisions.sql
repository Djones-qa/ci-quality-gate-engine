-- Create the decisions table for storing gate evaluation history
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id VARCHAR(255) NOT NULL,
  environment VARCHAR(100) NOT NULL,
  verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('pass', 'warn', 'fail', 'rollback')),
  score DECIMAL(5, 2) NOT NULL,
  strategy VARCHAR(50) NOT NULL,
  summary JSONB NOT NULL,
  results JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_decisions_build_id ON decisions (build_id);
CREATE INDEX IF NOT EXISTS idx_decisions_environment ON decisions (environment);
CREATE INDEX IF NOT EXISTS idx_decisions_verdict ON decisions (verdict);
CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_env_timestamp ON decisions (environment, timestamp DESC);
