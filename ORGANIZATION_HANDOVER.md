# Sentralogis Organization Handover - May 2, 2026

## 1. Project Status Summary
The Multi-SBU (Strategic Business Unit) organization management system is now **fully functional and stable**. 
- **Tenant Superadmin** (admin@halu.com) can manage both HQ staff and SBU staff.
- **Role Synchronization** between Auth, Profiles, and Organization tables is automated via database triggers and hardened RPC functions.

## 2. Current Organization (PT HALU)
| Name | Email | Role | Allocation |
|------|-------|------|------------|
| RAJA HALU | admin@halu.com | Tenant Superadmin | Central HQ |
| ROBERT | robert@halu.com | HQ Director Ops | Central HQ |
| fina | fin@halu.com | HQ Director Finance | Central HQ |
| JONI | joni@halu.com | SBU Manager Trucking | Unit Trucking (TR-01) |
| IWAN | iwan@halu.com | SBU Admin Trucking | Unit Trucking (TR-01) |

## 3. Key Schema Reference
- **`tenant_roles`**: Master list of all 20+ roles. 
  - HQ Levels (1-3)
  - SBU Levels (4-5): `sbu_[role]_[type]` (e.g., `sbu_admin_tr`)
- **`tenant_sbus`**: Registered units for the tenant (Trucking, Warehouse, Clearance, Forwarding).
- **`tenant_users`**: The source of truth for the Organization List. Joins `user_id` to `tenant_id` and `sbu_id`.

## 4. Hardened Database Functions (DO NOT OVERWRITE WITHOUT CARE)
- **`add_tenant_staff`**: Handles creating/updating users and forcing them into the organization table. Called via Server Action.
- **`handle_new_user`**: Trigger on `auth.users` that creates the profile row with the correct role from metadata.
- **`sync_user_role`**: Keeps `tenant_users` and `profiles` role_code in sync.

## 5. Key UI Files
- `app/(dashboard)/tenant/staff/page.tsx`: Main management UI with HQ/SBU tabs and stats.
- `app/(dashboard)/tenant/staff/actions.ts`: Server-side logic using Service Role for Auth Admin operations.
- `components/tenant/AddStaffModal.tsx`: Simplified 4-role selection for SBUs.

## 6. Next Steps for Tomorrow
- [ ] **SBU Token/Dashboard**: Implementation of SBU-specific views (e.g., Joni & Iwan login should see Trucking Dashboard).
- [ ] **Staff Permissions**: Refining access control for `sbu_ops` and `sbu_fin` roles.
- [ ] **Clean Up**: Remove debug info (amber box) from `staff/page.tsx` once everything is verified.

---
**Note to AI Assistant:** When resuming, check `admin@halu.com` as the primary tester for organization management. Everything in `tenant_users` is now strictly validated against `tenant_roles`.
