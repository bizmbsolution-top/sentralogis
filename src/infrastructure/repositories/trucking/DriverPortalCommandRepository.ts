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

  public async acceptJob(joId: string): Promise<void> {
    await this.supabase.from("job_orders").update({
      status: "DRIVER_ACCEPTED",
      driver_response: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", joId);
  }

  public async rejectJob(joId: string, rejectionNote: string): Promise<void> {
    await this.supabase.from("job_orders").update({
      status: "ASSIGNED",
      driver_response: "rejected",
      rejection_note: rejectionNote,
      driver_id: null,
      fleet_id: null,
      updated_at: new Date().toISOString(),
    }).eq("id", joId);
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
