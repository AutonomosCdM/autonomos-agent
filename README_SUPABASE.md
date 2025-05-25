# Supabase Local Development Setup

## Prerequisites

1. **Docker Desktop**: Required for running Supabase locally
   - Download from: https://www.docker.com/products/docker-desktop/
   - Make sure Docker is running before starting Supabase

2. **Supabase CLI**: Already installed
   ```bash
   # To update to latest version:
   brew upgrade supabase
   ```

## Starting Supabase

1. Start Docker Desktop
2. Run Supabase:
   ```bash
   supabase start
   ```

This will start:
- PostgreSQL database on port 54322
- Supabase API on port 54321
- Supabase Studio on port 54323

## First Time Setup

After starting Supabase for the first time:

1. The migrations will run automatically from `supabase/migrations/`
2. Access Supabase Studio at http://localhost:54323
3. Run seed data (optional):
   ```bash
   supabase db seed
   ```

## Database Migrations

All database changes are in `supabase/migrations/`:
- `20250525_001_initial_schema.sql` - Core tables
- `20250525_002_rls_policies.sql` - Row Level Security
- `20250525_003_functions.sql` - Helper functions

## Environment Variables

The `.env` file is configured with local Supabase URLs and keys:
- `SUPABASE_URL=http://localhost:54321`
- `SUPABASE_ANON_KEY` - Public anon key for client-side
- `SUPABASE_SERVICE_KEY` - Service role key for server-side

## Useful Commands

```bash
# Check status
supabase status

# Stop Supabase
supabase stop

# Reset database
supabase db reset

# Create new migration
supabase migration new <migration_name>

# Run migrations
supabase db push
```

## Testing the Setup

1. Start the application:
   ```bash
   npm run dev
   ```

2. Test the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

3. The seed data creates:
   - Organization: `test-org`
   - Admin user: `admin@test.com`
   - Test agent and channels

## Next Steps

1. Start Docker Desktop
2. Run `supabase start`
3. Implement authentication flows
4. Complete webhook integrations