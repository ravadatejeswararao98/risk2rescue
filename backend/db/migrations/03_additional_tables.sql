-- 1. citizen_reports
CREATE TABLE IF NOT EXISTS citizen_reports (
    id VARCHAR(255) PRIMARY KEY,
    location geometry(Point, 4326),
    timestamp BIGINT,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for temporal and spatial queries on citizen_reports
CREATE INDEX IF NOT EXISTS citizen_reports_loc_idx ON citizen_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS citizen_reports_timestamp_idx ON citizen_reports (timestamp DESC);

-- 2. emergency_alerts
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id VARCHAR(255) PRIMARY KEY,
    timestamp BIGINT,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS emergency_alerts_timestamp_idx ON emergency_alerts (timestamp DESC);

-- 3. datasources
CREATE TABLE IF NOT EXISTS datasources (
    id VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grant appropriate permissions to our roles
GRANT SELECT, INSERT, UPDATE, DELETE ON citizen_reports TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON emergency_alerts TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON datasources TO app_backend;

GRANT SELECT ON citizen_reports TO app_authority_portal;
GRANT SELECT ON emergency_alerts TO app_authority_portal;
GRANT SELECT ON datasources TO app_authority_portal;

-- Allow ai_service to read them if needed
GRANT SELECT ON citizen_reports TO app_ai_service;
GRANT SELECT ON emergency_alerts TO app_ai_service;
