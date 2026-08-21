import { supabase } from '@/lib/supabase/client';

// Fetch master selling price based on service type
export async function fetchMasterSellingPrice(
  containerType: string,
  shipmentType: string = 'domestic'
): Promise<number | null> {
  const { data, error } = await (supabase
    .from('fw_price_master' as any) as any)
    .select('price_amount')
    .eq('container_type', containerType)
    .eq('service_type', 'forwarding')
    .eq('shipment_type', shipmentType)
    .eq('sub_type', 'standard')
    .single();

  if (error || !data) return null;
  return data.price_amount;
}

// Fetch master costing breakdown
export async function fetchMasterCosting(
  originLocationId: string,
  destinationLocationId: string,
  executionMode: 'OWN' | 'VENDOR' = 'OWN'
): Promise<{ originCost: number; destinationCost: number } | null> {
  const { data, error } = await (supabase
    .from('fw_price_master' as any) as any)
    .select('master_cost_origin_amount, master_cost_destination_amount')
    .eq('origin_location_id', originLocationId)
    .eq('destination_location_id', destinationLocationId)
    .single();

  if (error || !data) return null;

  return {
    originCost: data.master_cost_origin_amount || 0,
    destinationCost: data.master_cost_destination_amount || 0
  };
}

// Auto-populate pricing for forwarding order
export async function autoPopulatePricing(
  containerType: string,
  originLocationId: string,
  destinationLocationId: string,
  executionMode: 'OWN' | 'VENDOR' = 'OWN'
): Promise<{
  sellingPrice: number;
  costing: { originCost: number; destinationCost: number };
  profit: number;
}> {
  const [sellingPrice, costing] = await Promise.all([
    fetchMasterSellingPrice(containerType),
    fetchMasterCosting(originLocationId, destinationLocationId, executionMode)
  ]);

  const totalCost = (costing?.originCost || 0) + (costing?.destinationCost || 0);
  const profit = (sellingPrice || 0) - totalCost;

  return {
    sellingPrice: sellingPrice || 0,
    costing: costing || { originCost: 0, destinationCost: 0 },
    profit
  };
}