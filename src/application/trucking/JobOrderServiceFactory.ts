import { SupabaseClient } from '@supabase/supabase-js';
import { JobOrderService } from './services/JobOrderService';
import { PermissionEngine } from '../../domains/security/permissions/PermissionEngine';
import { DefaultPolicyProvider } from '../../domains/security/permissions/DefaultPolicyProvider';
import { SupabaseJobOrderRepository } from '../../infrastructure/repositories/trucking/SupabaseJobOrderRepository';
import { SupabaseDriverRepository } from '../../infrastructure/repositories/trucking/SupabaseDriverRepository';
import { SupabaseVehicleRepository } from '../../infrastructure/repositories/trucking/SupabaseVehicleRepository';
import { LegacyJobOrderSyncService } from '../../infrastructure/repositories/trucking/LegacyJobOrderSyncService';

export function getJobOrderService(supabase: SupabaseClient): JobOrderService {
  const policyProvider = new DefaultPolicyProvider();
  const permissionEngine = new PermissionEngine(policyProvider);

  const jobOrderRepo = new SupabaseJobOrderRepository(supabase);
  const driverRepo = new SupabaseDriverRepository(supabase);
  const vehicleRepo = new SupabaseVehicleRepository(supabase);

  return new JobOrderService(
    permissionEngine,
    jobOrderRepo,
    driverRepo,
    vehicleRepo
  );
}

export function getLegacyJobOrderSyncService(supabase: SupabaseClient): LegacyJobOrderSyncService {
  return new LegacyJobOrderSyncService(supabase);
}
