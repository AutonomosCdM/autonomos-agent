import { supabaseAdmin } from '../../lib/supabase';
import type { Organization, CreateOrganizationResult } from '../../types/database';

export class OrganizationService {
  static async create(
    name: string,
    slug: string,
    adminEmail: string,
    adminName: string
  ): Promise<CreateOrganizationResult> {
    const { data, error } = await supabaseAdmin.rpc('create_organization_with_admin', {
      org_name: name,
      org_slug: slug,
      admin_email: adminEmail,
      admin_name: adminName,
    });

    if (error) throw error;
    return data[0];
  }

  static async getBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async update(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getBySlackWorkspace(_workspaceId: string): Promise<Organization | null> {
    // For now, return the test organization
    // TODO: Implement proper slack workspace mapping
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', 'test-company')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}