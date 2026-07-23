-- Create the trends table for pre-aggregated daily statistics
CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  environment VARCHAR(100) NOT NULL,
  total_evaluations INT NOT NULL DEFAULT 0,
  pass_count INT NOT NULL DEFAULT 0,
  warn_count INT NOT NULL DEFAULT 0,
  fail_count INT NOT NULL DEFAULT 0,
  rollback_count INT NOT NULL DEFAULT 0,
  avg_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  avg_duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, environment)
);

-- Indexes for trend queries
CREATE INDEX IF NOT EXISTS idx_trends_date ON trends (date DESC);
CREATE INDEX IF NOT EXISTS idx_trends_environment ON trends (environment);
CREATE INDEX IF NOT EXISTS idx_trends_date_env ON trends (date DESC, environment);

-- Function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_trends_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_trends_updated_at ON trends;
CREATE TRIGGER trigger_trends_updated_at
  BEFORE UPDATE ON trends
  FOR EACH ROW
  EXECUTE FUNCTION update_trends_timestamp();
