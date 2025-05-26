import { supabaseAdmin } from '../../lib/supabase';
import type { Agent, ChannelAgentDetails } from '../../types/database';

export class AgentService {
  static async create(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent> {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert(agent)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<Agent | null> {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getByOrganization(organizationId: string, activeOnly = true): Promise<Agent[]> {
    let query = supabaseAdmin
      .from('agents')
      .select('*')
      .eq('organization_id', organizationId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getForChannel(channelId: string): Promise<ChannelAgentDetails | null> {
    // Get primary agent for channel
    const agent = await this.getPrimaryForChannel(channelId);
    if (!agent) return null;

    // Return in expected format
    return {
      agent_id: agent.id,
      name: agent.name,
      system_prompt: agent.system_prompt,
      model: agent.model,
      configuration: agent.configuration
    } as ChannelAgentDetails;
  }

  static async assignToChannel(agentId: string, channelId: string, isPrimary = false): Promise<void> {
    const { error } = await supabaseAdmin
      .from('channel_agents')
      .insert({
        agent_id: agentId,
        channel_id: channelId,
        is_primary: isPrimary,
      });

    if (error && error.code !== '23505') throw error; // Ignore duplicate key errors
  }

  static async removeFromChannel(agentId: string, channelId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('channel_agents')
      .delete()
      .eq('agent_id', agentId)
      .eq('channel_id', channelId);

    if (error) throw error;
  }

  static async update(id: string, updates: Partial<Agent>): Promise<Agent> {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deactivate(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('agents')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  static async getPrimaryForChannel(channelId: string): Promise<Agent | null> {
    // First get the primary agent assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('channel_agents')
      .select('agent_id')
      .eq('channel_id', channelId)
      .eq('is_primary', true)
      .single();

    if (assignmentError && assignmentError.code !== 'PGRST116') throw assignmentError;
    if (!assignment) return null;

    // Then get the agent details
    return this.getById(assignment.agent_id);
  }
}