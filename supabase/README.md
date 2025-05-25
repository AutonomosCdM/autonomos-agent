# Supabase Setup for Autonomos Agent

## Prerequisites

1. Create a new Supabase project at https://supabase.com
2. Note down your project URL and API keys

## Database Setup

Execute the SQL files in this order:

1. **schema.sql** - Creates all the tables and indexes
2. **rls_policies.sql** - Sets up Row Level Security policies
3. **functions.sql** - Creates helper functions

You can run these in the Supabase SQL editor.

## Environment Variables

Add these to your `.env` file:

```env
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

## Initial Setup

After running the SQL files, create your first organization:

```sql
SELECT * FROM create_organization_with_admin(
  'Your Company Name',
  'your-company-slug',
  'admin@yourcompany.com',
  'Admin Name'
);
```

## Testing RLS Policies

To test Row Level Security:

1. Create a test user in Supabase Auth
2. Link the user to your organization
3. Test queries with different roles

## Multi-tenant Architecture

- Each organization is isolated through RLS policies
- Users can only access data from their organization
- Service role key bypasses RLS for server-side operations
- API keys are organization-scoped