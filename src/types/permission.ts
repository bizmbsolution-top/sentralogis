// src/types/permission.ts
// Foundation model for Phase 1B Security Permission Engine
export enum UserRole {
  ADMIN = "ADMIN",
  CUSTOMER_MANAGER = "CUSTOMER_MANAGER",
  OPS_MANAGER = "OPS_MANAGER",
  DISPATCHER = "DISPATCHER",
  DRIVER = "DRIVER",
  FINANCE = "FINANCE",
}

export enum PermissionAction {
  READ = "READ",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  APPROVE = "APPROVE",
  ASSIGN = "ASSIGN",
}

export enum PermissionResource {
  WORK_ORDER = "WORK_ORDER",
  JOB_ORDER = "JOB_ORDER",
  TRUCKING = "TRUCKING",
  WAREHOUSE = "WAREHOUSE",
  FORWARDING = "FORWARDING",
  BILLING = "BILLING",
  CUSTOMER = "CUSTOMER",
  DRIVER = "DRIVER",
  VEHICLE = "VEHICLE",
  CONTAINER = "CONTAINER",
}

export interface Permission {
  role: UserRole;
  action: PermissionAction;
  resource: PermissionResource;
}

export interface UserContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}
