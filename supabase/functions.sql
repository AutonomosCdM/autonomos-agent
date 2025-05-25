-- Function to create a new organization with an admin user
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name TEXT,
  org_slug TEXT,
  admin_email TEXT,
  admin_name TEXT
)
RETURNS TABLE (
  organization_id UUID,
  user_id UUID
) AS $$
DECLARE
  new_org_id UUID;
  new_user_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;
  
  -- Create admin user
  INSERT INTO users (organization_id, email, full_name, role)
  VALUES (new_org_id, admin_email, admin_name, 'admin')
  RETURNING id INTO new_user_id;
  
  RETURN QUERY SELECT new_org_id, new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_organization_id UUID,
  p_channel_id UUID,
  p_external_id TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Try to get existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE channel_id = p_channel_id 
    AND external_id = p_external_id
    AND status = 'active';
  
  -- If not found, create new one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (organization_id, channel_id, external_id, metadata)
    VALUES (p_organization_id, p_channel_id, p_external_id, p_metadata)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add message and get AI response
CREATE OR REPLACE FUNCTION add_message(
  p_organization_id UUID,
  p_conversation_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO messages (organization_id, conversation_id, role, content, metadata)
  VALUES (p_organization_id, p_conversation_id, p_role, p_content, p_metadata)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation history
CREATE OR REPLACE FUNCTION get_conversation_history(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.role, m.content, m.metadata, m.created_at
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active agent for channel
CREATE OR REPLACE FUNCTION get_channel_agent(
  p_channel_id UUID
)
RETURNS TABLE (
  agent_id UUID,
  name TEXT,
  system_prompt TEXT,
  model TEXT,
  configuration JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name, a.system_prompt, a.model, a.configuration
  FROM agents a
  JOIN channel_agents ca ON ca.agent_id = a.id
  WHERE ca.channel_id = p_channel_id
    AND a.is_active = true
    AND (ca.is_primary = true OR ca.id = (
      SELECT id FROM channel_agents 
      WHERE channel_id = p_channel_id 
      ORDER BY created_at ASC 
      LIMIT 1
    ))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create API key
CREATE OR REPLACE FUNCTION create_api_key(
  p_organization_id UUID,
  p_name TEXT,
  p_expires_in_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
  api_key TEXT,
  key_id UUID
) AS $$
DECLARE
  v_key TEXT;
  v_key_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate random key
  v_key := encode(gen_random_bytes(32), 'base64');
  
  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;
  
  -- Insert hashed key
  INSERT INTO api_keys (organization_id, name, key_hash, expires_at)
  VALUES (p_organization_id, p_name, crypt(v_key, gen_salt('bf')), v_expires_at)
  RETURNING id INTO v_key_id;
  
  RETURN QUERY SELECT v_key, v_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(
  p_api_key TEXT
)
RETURNS TABLE (
  organization_id UUID,
  key_id UUID
) AS $$
DECLARE
  v_org_id UUID;
  v_key_id UUID;
BEGIN
  SELECT ak.organization_id, ak.id INTO v_org_id, v_key_id
  FROM api_keys ak
  WHERE ak.key_hash = crypt(p_api_key, ak.key_hash)
    AND ak.revoked_at IS NULL
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
    
  IF v_key_id IS NOT NULL THEN
    -- Update last used
    UPDATE api_keys SET last_used_at = NOW() WHERE id = v_key_id;
    
    RETURN QUERY SELECT v_org_id, v_key_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;