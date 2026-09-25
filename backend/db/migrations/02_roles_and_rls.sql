-- 1. Create Roles
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_backend') THEN
      CREATE ROLE app_backend WITH NOLOGIN;
   END IF;
   
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_ai_service') THEN
      CREATE ROLE app_ai_service WITH NOLOGIN;
   END IF;

   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_authority_portal') THEN
      CREATE ROLE app_authority_portal WITH NOLOGIN;
   END IF;
END
$do$;

-- 2. Grant least-privilege access per role

-- app_backend: General backend access
GRANT SELECT, INSERT, UPDATE, DELETE ON hazard_zones TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON hazard_readings TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON authorities TO app_backend;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_backend;

-- app_ai_service: AI ingestion/generation
GRANT SELECT, INSERT ON hazard_readings TO app_ai_service;
GRANT SELECT ON hazard_zones TO app_ai_service;

-- app_authority_portal: Authority UI read-only access
GRANT SELECT ON hazard_readings TO app_authority_portal;
GRANT SELECT ON hazard_zones TO app_authority_portal;
GRANT SELECT ON authorities TO app_authority_portal;

-- 3. Row-Level Security on 'authorities' table

-- Enable RLS
ALTER TABLE authorities ENABLE ROW LEVEL SECURITY;

-- Create policy so authorities can only see rows matching their own district.
-- This assumes your application sets the local context (e.g., SET LOCAL app.current_district = 'Visakhapatnam';)
-- before querying the database using the app_authority_portal role.
CREATE POLICY authority_district_isolation_policy
    ON authorities
    FOR SELECT
    TO app_authority_portal
    USING (district = current_setting('app.current_district', true));

-- The backend usually needs to bypass this to see all authorities (e.g., for login)
CREATE POLICY authority_backend_bypass_policy
    ON authorities
    FOR ALL
    TO app_backend
    USING (true)
    WITH CHECK (true);
