import { supabaseAdmin } from '../../lib/supabase';
import type { CreateApiKeyResult, ValidateApiKeyResult } from '../../types/database';

export class AuthService {
  static async createApiKey(
    organizationId: string,
    name: string,
    expiresInDays?: number
  ): Promise<CreateApiKeyResult> {
    const { data, error } = await supabaseAdmin.rpc('create_api_key', {
      p_organization_id: organizationId,
      p_name: name,
      p_expires_in_days: expiresInDays,
    });

    if (error) throw error;
    return data[0];
  }

  static async validateApiKey(apiKey: string): Promise<ValidateApiKeyResult | null> {
    const { data, error } = await supabaseAdmin.rpc('validate_api_key', {
      p_api_key: apiKey,
    });

    if (error) throw error;
    return data?.[0] || null;
  }

  static async revokeApiKey(keyId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    if (error) throw error;
  }

  static async getApiKeysByOrganization(organizationId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, last_used_at, expires_at, created_at, revoked_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}