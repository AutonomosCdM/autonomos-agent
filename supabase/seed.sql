-- Create test organization and admin user
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'admin@test.com',
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW()
);

-- Create test organization with admin
SELECT * FROM create_organization_with_admin(
  'Test Organization',
  'test-org',
  'admin@test.com',
  'Test Admin'
);

-- Get the organization ID for further operations
DO $$
DECLARE
  org_id UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-org';
  SELECT id INTO admin_id FROM users WHERE email = 'admin@test.com';

  -- Create a test agent
  INSERT INTO agents (organization_id, name, description, system_prompt, model, configuration)
  VALUES (
    org_id,
    'Test Assistant',
    'A helpful AI assistant for testing',
    'You are a helpful AI assistant. Be concise and friendly in your responses.',
    'claude-3-sonnet-20240229',
    '{"temperature": 0.7, "max_tokens": 1000}'::jsonb
  );

  -- Create WhatsApp channel
  INSERT INTO channels (organization_id, type, name, configuration)
  VALUES (
    org_id,
    'whatsapp',
    'Test WhatsApp',
    '{"phone_number": "+1234567890", "twilio_account_sid": "test_sid"}'::jsonb
  );

  -- Create Slack channel
  INSERT INTO channels (organization_id, type, name, configuration)
  VALUES (
    org_id,
    'slack',
    'Test Slack Workspace',
    '{"team_id": "T12345", "team_name": "Test Workspace", "bot_token": "xoxb-test"}'::jsonb
  );

  -- Assign agent to channels
  INSERT INTO channel_agents (channel_id, agent_id, is_primary)
  SELECT c.id, a.id, true
  FROM channels c
  CROSS JOIN agents a
  WHERE c.organization_id = org_id AND a.organization_id = org_id;

  -- Create an API key for testing
  PERFORM create_api_key(org_id, 'Development API Key', 365);
END $$;

-- Display important information
SELECT 
  'Organization created: ' || o.name || ' (slug: ' || o.slug || ')' as info
FROM organizations o
WHERE o.slug = 'test-org'
UNION ALL
SELECT 
  'Admin user: ' || u.email || ' (role: ' || u.role || ')'
FROM users u
WHERE u.email = 'admin@test.com'
UNION ALL
SELECT 
  'Agent configured: ' || a.name
FROM agents a
JOIN organizations o ON a.organization_id = o.id
WHERE o.slug = 'test-org'
UNION ALL
SELECT 
  'Channel configured: ' || c.type || ' - ' || c.name
FROM channels c
JOIN organizations o ON c.organization_id = o.id
WHERE o.slug = 'test-org';