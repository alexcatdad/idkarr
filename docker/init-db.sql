-- Initialize idkarr database
-- This script runs when the PostgreSQL container is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Grant permissions (already done by POSTGRES_USER but explicit for clarity)
GRANT ALL PRIVILEGES ON DATABASE idkarr TO idkarr;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'idkarr database initialized successfully';
END $$;
