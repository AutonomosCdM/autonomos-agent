export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  organization_id: string;
  type: 'whatsapp' | 'slack';
  name: string;
  configuration: {
    // WhatsApp configuration
    phone_number?: string;
    twilio_account_sid?: string;
    
    // Slack configuration
    team_id?: string;
    team_name?: string;
    bot_token?: string;
    app_id?: string;
    
    [key: string]: unknown;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  channel_id: string;
  external_id: string; // WhatsApp phone or Slack user/channel ID
  metadata: {
    user_name?: string;
    user_phone?: string;
    slack_channel_name?: string;
    [key: string]: unknown;
  };
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  organization_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    message_sid?: string; // Twilio message ID
    slack_ts?: string; // Slack timestamp
    model?: string;
    tokens?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  model: string;
  configuration: {
    temperature?: number;
    max_tokens?: number;
    tools?: string[];
    [key: string]: unknown;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelAgent {
  id: string;
  channel_id: string;
  agent_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface WebhookLog {
  id: string;
  organization_id: string;
  channel_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  response: Record<string, unknown> | null;
  status_code: number | null;
  created_at: string;
}

// Database function return types
export interface CreateOrganizationResult {
  organization_id: string;
  user_id: string;
}

export interface ChannelAgentDetails {
  agent_id: string;
  name: string;
  system_prompt: string | null;
  model: string;
  configuration: Record<string, unknown>;
}

export interface CreateApiKeyResult {
  api_key: string;
  key_id: string;
}

export interface ValidateApiKeyResult {
  organization_id: string;
  key_id: string;
}