-- Create the metrics table for storing individual collector results
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL,
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(15, 4) NOT NULL,
  threshold DECIMAL(15, 4),
  operator VARCHAR(20),
  passed BOOLEAN NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'fail',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for metric queries
CREATE INDEX IF NOT EXISTS idx_metrics_decision_id ON metrics (decision_id);
CREATE INDEX IF NOT EXISTS idx_metrics_source ON metrics (source);
CREATE INDEX IF NOT EXISTS idx_metrics_passed ON metrics (passed);
CREATE INDEX IF NOT EXISTS idx_metrics_source_name ON metrics (source, metric_name);
