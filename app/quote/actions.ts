'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getDealQuotationsPublic(dealId: string) {
  const supabase = createAdminClient();
  
  // 1. Fetch crm_quotations joined with crm_deals
  const { data: quotesData, error: quotesErr } = await supabase
    .from('crm_quotations')
    .select(`
      *, 
      crm_deals(title, entity_id, md_entities(name, billing_address, phone, email))
    `)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });
    
  if (quotesErr) {
    console.error('Error fetching public deal quotes:', quotesErr);
    return null;
  }
  
  if (!quotesData || quotesData.length === 0) {
    return null;
  }
  
  // 2. Fetch tenant details
  const primaryTenantId = quotesData[0].tenant_id;
  let tenantData: any = null;
  if (primaryTenantId) {
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .or(`id.eq.${primaryTenantId},tenant_code.eq.${primaryTenantId},user_id.eq.${primaryTenantId}`)
      .limit(1);
    if (data && data.length > 0) {
      tenantData = data[0];
    }
  }
  
  if (!tenantData && primaryTenantId) {
    const { data: prof } = await supabase.from('profiles').select('full_name').or(`id.eq.${primaryTenantId},tenant_id.eq.${primaryTenantId}`).limit(1);
    if (prof && prof.length > 0) {
      tenantData = { name: prof[0].full_name || 'PT Sentralogis Nusantara', company_name: prof[0].full_name || 'PT Sentralogis Nusantara' };
    }
  }
  
  if (!tenantData) {
    tenantData = { name: 'PT Sentralogis Nusantara', company_name: 'PT Sentralogis Nusantara' };
  }
  
  // Attach tenant data
  quotesData.forEach(q => {
    q.tenants = tenantData;
  });
  
  const quoteIds = quotesData.map(q => q.id);
  
  // 3. Fetch sections
  const { data: sectionsData } = await supabase
    .from('crm_quotation_sections')
    .select('*')
    .in('quotation_id', quoteIds);
    
  // 4. Fetch items
  const { data: itemsData } = await supabase
    .from('crm_quotation_items')
    .select('*')
    .in('quotation_id', quoteIds)
    .order('created_at', { ascending: true });
    
  return {
    quotes: quotesData,
    sections: sectionsData || [],
    items: itemsData || []
  };
}

export async function getQuotationPublic(quoteId: string) {
  const supabase = createAdminClient();
  
  const { data: quoteData, error: quoteErr } = await supabase
    .from('crm_quotations')
    .select(`
      *, 
      crm_deals(title, entity_id, md_entities(name, billing_address, phone, email))
    `)
    .eq('id', quoteId)
    .single();
    
  if (quoteErr || !quoteData) {
    console.error('Error fetching public quote:', quoteErr);
    return null;
  }
  
  // Fetch tenant details
  let tenantData: any = null;
  if (quoteData.tenant_id) {
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .or(`id.eq.${quoteData.tenant_id},tenant_code.eq.${quoteData.tenant_id},user_id.eq.${quoteData.tenant_id}`)
      .limit(1);
    if (data && data.length > 0) {
      tenantData = data[0];
    }
  }
  
  if (!tenantData && quoteData.tenant_id) {
    const { data: prof } = await supabase.from('profiles').select('full_name').or(`id.eq.${quoteData.tenant_id},tenant_id.eq.${quoteData.tenant_id}`).limit(1);
    if (prof && prof.length > 0) {
      tenantData = { name: prof[0].full_name || 'PT Sentralogis Nusantara', company_name: prof[0].full_name || 'PT Sentralogis Nusantara' };
    }
  }
  
  if (!tenantData) {
    tenantData = { name: 'PT Sentralogis Nusantara', company_name: 'PT Sentralogis Nusantara' };
  }
  
  quoteData.tenants = tenantData;
  
  // Fetch SBU Sections
  const { data: sectionsData } = await supabase
    .from('crm_quotation_sections')
    .select('*')
    .eq('quotation_id', quoteId);
    
  // Fetch Items
  const { data: itemsData } = await supabase
    .from('crm_quotation_items')
    .select('*')
    .eq('quotation_id', quoteId)
    .order('created_at', { ascending: true });
    
  return {
    quote: quoteData,
    sections: sectionsData || [],
    items: itemsData || []
  };
}

export async function customerApproveQuotation(quoteId: string, approverName?: string) {
  const supabase = createAdminClient();
  
  const { data: quote, error: getErr } = await supabase
    .from('crm_quotations')
    .select('id, deal_id, quote_number, status')
    .eq('id', quoteId)
    .single();
    
  if (getErr || !quote) {
    return { success: false, error: 'Quotation not found' };
  }
  
  const { error: updErr } = await supabase
    .from('crm_quotations')
    .update({ status: 'ACCEPTED' })
    .eq('id', quoteId);
    
  if (updErr) {
    return { success: false, error: updErr.message };
  }
  
  if (quote.deal_id) {
    await supabase
      .from('crm_deals')
      .update({ stage: 'WON' })
      .eq('id', quote.deal_id);
  }
  
  return { success: true };
}

export async function customerApproveDealQuotations(dealId: string, approverName?: string) {
  const supabase = createAdminClient();
  
  const { error: updErr } = await supabase
    .from('crm_quotations')
    .update({ status: 'ACCEPTED' })
    .eq('deal_id', dealId);
    
  if (updErr) {
    return { success: false, error: updErr.message };
  }
  
  await supabase
    .from('crm_deals')
    .update({ stage: 'WON' })
    .eq('id', dealId);
    
  return { success: true };
}
