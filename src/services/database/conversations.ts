import { supabaseAdmin } from '../../lib/supabase';
import type { Conversation, Message } from '../../types/database';

export class ConversationService {
  static async getOrCreate(
    organizationId: string,
    channelId: string,
    externalId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    const { data, error } = await supabaseAdmin.rpc('get_or_create_conversation', {
      p_organization_id: organizationId,
      p_channel_id: channelId,
      p_external_id: externalId,
      p_metadata: metadata,
    });

    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<Conversation | null> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getHistory(conversationId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await supabaseAdmin.rpc('get_conversation_history', {
      p_conversation_id: conversationId,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  }

  static async addMessage(
    organizationId: string,
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    const { data, error } = await supabaseAdmin.rpc('add_message', {
      p_organization_id: organizationId,
      p_conversation_id: conversationId,
      p_role: role,
      p_content: content,
      p_metadata: metadata,
    });

    if (error) throw error;
    return data;
  }

  static async archive(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
  }

  static async getActiveByChannel(channelId: string): Promise<Conversation[]> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('channel_id', channelId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}