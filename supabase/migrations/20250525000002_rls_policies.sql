-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Function to get organization_id from JWT
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'organization_id')::UUID,
    (SELECT organization_id FROM users WHERE id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Organizations visible to members" ON organizations
  FOR SELECT USING (
    id = auth.organization_id()
  );

CREATE POLICY "Organizations updateable by admins" ON organizations
  FOR UPDATE USING (
    id = auth.organization_id() AND auth.is_admin()
  );

-- Users policies
CREATE POLICY "Users visible to same organization" ON users
  FOR SELECT USING (
    organization_id = auth.organization_id()
  );

CREATE POLICY "Users insertable by admins" ON users
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id() AND auth.is_admin()
  );

CREATE POLICY "Users updateable by self or admin" ON users
  FOR UPDATE USING (
    organization_id = auth.organization_id() AND 
    (id = auth.uid() OR auth.is_admin())
  );

CREATE POLICY "Users deleteable by admins" ON users
  FOR DELETE USING (
    organization_id = auth.organization_id() AND auth.is_admin()
  );

-- Channels policies
CREATE POLICY "Channels visible to organization members" ON channels
  FOR SELECT USING (
    organization_id = auth.organization_id()
  );

CREATE POLICY "Channels manageable by admins" ON channels
  FOR ALL USING (
    organization_id = auth.organization_id() AND auth.is_admin()
  );

-- Conversations policies
CREATE POLICY "Conversations visible to organization members" ON conversations
  FOR SELECT USING (
    organization_id = auth.organization_id()
  );

CREATE POLICY "Conversations insertable by organization members" ON conversations
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
  );

CREATE POLICY "Conversations updateable by organization members" ON conversations
  FOR UPDATE USING (
    organization_id = auth.organization_id()
  );

-- Messages policies
CREATE POLICY "Messages visible to organization members" ON messages
  FOR SELECT USING (
    organization_id = auth.organization_id()
  );

CREATE POLICY "Messages insertable by organization members" ON messages
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
  );

-- Agents policies
CREATE POLICY "Agents visible to organization members" ON agents
  FOR SELECT USING (
    organization_id = auth.organization_id()
  );

CREATE POLICY "Agents manageable by admins" ON agents
  FOR ALL USING (
    organization_id = auth.organization_id() AND auth.is_admin()
  );

-- Channel agents policies
CREATE POLICY "Channel agents visible to organization members" ON channel_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channels 
      WHERE channels.id = channel_agents.channel_id 
      AND channels.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "Channel agents manageable by admins" ON channel_agents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM channels 
      WHERE channels.id = channel_agents.channel_id 
      AND channels.organization_id = auth.organization_id()
    ) AND auth.is_admin()
  );

-- API Keys policies
CREATE POLICY "API Keys visible to admins" ON api_keys
  FOR SELECT USING (
    organization_id = auth.organization_id() AND auth.is_admin()
  );

CREATE POLICY "API Keys manageable by admins" ON api_keys
  FOR ALL USING (
    organization_id = auth.organization_id() AND auth.is_admin()
  );

-- Webhook logs policies
CREATE POLICY "Webhook logs visible to organization members" ON webhook_logs
  FOR SELECT USING (
    organization_id = auth.organization_id()
  );

CREATE POLICY "Webhook logs insertable by system" ON webhook_logs
  FOR INSERT WITH CHECK (
    organization_id = auth.organization_id()
  );

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role bypass" ON organizations
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON users
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON channels
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON conversations
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON messages
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON agents
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON channel_agents
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');