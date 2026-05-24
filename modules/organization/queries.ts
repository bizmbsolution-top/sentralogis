import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/types/enterprise";

const supabase = createClient()!;

export async function getOrganizationTree(tenantId: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('wo_organizations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('org_path');
  if (error) throw error;
  return data || [];
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('wo_organizations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getChildOrgs(parentId: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('wo_organizations')
    .select('*')
    .eq('parent_org_id', parentId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function getHQOrg(tenantId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('wo_organizations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('org_type', 'HQ')
    .single();
  if (error) return null;
  return data;
}

export function buildOrgTree(orgs: Organization[], parentId: string | null = null): OrgTreeNode[] {
  return orgs
    .filter(o => o.parent_org_id === parentId)
    .map(o => ({
      ...o,
      children: buildOrgTree(orgs, o.id),
    }));
}

export interface OrgTreeNode extends Organization {
  children: OrgTreeNode[];
}
