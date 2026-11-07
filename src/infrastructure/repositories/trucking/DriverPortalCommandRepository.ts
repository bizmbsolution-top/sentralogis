import { SupabaseClient } from '@supabase/supabase-js';

// Phase 3D.7: Extracted mutations to remove SQL from the API controller
export class DriverPortalCommandRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async updateContainer(joId: string, containerNumber?: string, sealNumber?: string, existingMeta: any = {}): Promise<void> {
    const updatedMeta = { ...existingMeta, ...(sealNumber !== undefined ? { seal_number: sealNumber } : {}) };
    const updatePayload: any = { sbu_metadata: updatedMeta, updated_at: new Date().toISOString() };
    if (containerNumber !== undefined) updatePayload.container_number = containerNumber;
    await this.supabase.from("job_orders").update(updatePayload).eq("id", joId);
  }

  private async confirmDriverResponse(joId: string, accepted: boolean, rejectionNote?: string): Promise<string> {
    const { data, error } = await this.supabase.rpc("vendor_job_confirmation", {
      p_jo_id: joId,
      p_is_accepted: accepted,
      p_is_timeout: false,
      p_rejection_reason: rejectionNote || null,
      p_lat: null,
      p_lng: null,
    });

    if (error) throw new Error(error.message || "Gagal menyimpan respons driver");
    if (!data?.success) throw new Error(data?.error || "Respons driver tidak dapat diproses");
    return String(data.new_status || "");
  }

  public async acceptJob(joId: string): Promise<string> {
    return this.confirmDriverResponse(joId, true);
  }

  public async rejectJob(joId: string, rejectionNote: string): Promise<string> {
    return this.confirmDriverResponse(joId, false, rejectionNote);
  }

  public async updateRouteStatus(routeId: string, status: string, notes?: string, photoUrl?: string): Promise<void> {
    const payload: any = { status };
    if (status === 'arrived') payload.actual_arrival = new Date().toISOString();
    if (status === 'completed') payload.actual_departure = new Date().toISOString();
    if (notes) payload.notes = notes;
    if (photoUrl) payload.pod_photo_url = photoUrl;
    
    await this.supabase.from("job_routes").update(payload).eq("id", routeId);
  }
}
