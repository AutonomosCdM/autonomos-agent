import { supabaseAdmin } from '../../lib/supabase';
import type { Channel } from '../../types/database';

export class ChannelService {
  static async create(channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>): Promise<Channel> {
    const { data, error } = await supabaseAdmin
      .from('channels')
      .insert(channel)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<Channel | null> {
    const { data, error } = await supabaseAdmin
      .from('channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getByOrganization(organizationId: string): Promise<Channel[]> {
    const { data, error } = await supabaseAdmin
      .from('channels')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getByTypeAndConfig(
    organizationId: string,
    type: 'whatsapp' | 'slack',
    configKey: string,
    configValue: string
  ): Promise<Channel | null> {
    const { data, error } = await supabaseAdmin
      .from('channels')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', type)
      .eq('is_active', true);

    if (error) throw error;

    // Filter by configuration in application code
    const channel = data?.find(ch => ch.configuration[configKey] === configValue);
    return channel || null;
  }

  static async update(id: string, updates: Partial<Channel>): Promise<Channel> {
    const { data, error } = await supabaseAdmin
      .from('channels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deactivate(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('channels')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }
}