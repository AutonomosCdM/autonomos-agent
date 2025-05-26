import { supabaseAdmin } from '../../lib/supabase';
import type { Conversation, Message } from '../../types/database';

export class ConversationService {
  static async getOrCreate(
    organizationId: string,
    channelId: string,
    externalId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    // First try to find existing conversation
    const { data: existing, error: findError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('channel_id', channelId)
      .eq('external_id', externalId)
      .single();

    if (findError && findError.code !== 'PGRST116') throw findError;
    
    if (existing) {
      return existing.id;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabaseAdmin
      .from('conversations')
      .insert({
        organization_id: organizationId,
        channel_id: channelId,
        external_id: externalId,
        metadata,
        status: 'active'
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return newConv.id;
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
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

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
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        role,
        content,
        metadata
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
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

  static async getMessages(
    organizationId: string, 
    conversationId: string, 
    limit = 20
  ): Promise<Message[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}