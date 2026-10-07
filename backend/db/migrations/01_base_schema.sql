-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Create authorities table
CREATE TABLE IF NOT EXISTS authorities (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    district VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create hazard_zones table
CREATE TABLE IF NOT EXISTS hazard_zones (
    id SERIAL PRIMARY KEY,
    tier VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    geom geometry(Polygon, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create GIST index for hazard_zones geometry
CREATE INDEX IF NOT EXISTS hazard_zones_geom_idx ON hazard_zones USING GIST (geom);

-- 4. Create hazard_readings table
CREATE TABLE IF NOT EXISTS hazard_readings (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(100) NOT NULL,
    location geometry(Geometry, 4326) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50) NOT NULL
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('hazard_readings', 'time', if_not_exists => TRUE);

-- Create GIST index for hazard_readings location
CREATE INDEX IF NOT EXISTS hazard_readings_loc_idx ON hazard_readings USING GIST (location);

-- Create time index for hazard_readings (create_hypertable creates a default time index, but adding explicitly as requested)
CREATE INDEX IF NOT EXISTS hazard_readings_time_idx ON hazard_readings (time DESC);
