import { createClient } from "@/lib/supabase/client";
import { getWorkflowForWoType } from "@/lib/workflow/registry";
import type { WorkflowDefinition, WorkflowStep } from "@/lib/workflow/registry";
import type { WorkOrder, WorkOrderItem } from "@/types/enterprise";

const supabase = createClient()!;

export type OrgMappingResult = {
  org_id: string;
  warehouse_id?: string;
};

export interface WorkflowExecutionContext {
  workOrder: WorkOrder;
  items: WorkOrderItem[];
  orgMapping: Record<string, OrgMappingResult>;
  tenantId: string;
}

export async function executeWorkflow(woId: string): Promise<void> {
  const { data, error: woErr } = await supabase
    .from('wo_work_orders')
    .select('*')
    .eq('id', woId)
    .single();
  if (woErr || !data) throw new Error(`Work order ${woId} not found`);
  const wo = data as unknown as WorkOrder;

  const definition = getWorkflowForWoType(wo.wo_type);
  if (!definition) throw new Error(`No workflow definition for type: ${wo.wo_type}`);

  const { data: itemsData } = await supabase
    .from('wo_work_order_items')
    .select('*')
    .eq('work_order_id', woId);
  const items = (itemsData as unknown as WorkOrderItem[]) || [];

  const ctx: WorkflowExecutionContext = {
    workOrder: wo,
    items: items,
    orgMapping: await resolveOrgMapping(wo),
    tenantId: wo.tenant_id,
  };

  await startWorkflowInstance(wo, definition);
  await executeSteps(ctx, definition, woId);
  await completeWorkflowInstance(wo.correlation_id);
}

async function executeSteps(ctx: WorkflowExecutionContext, def: WorkflowDefinition, woId: string): Promise<void> {
  const completed = new Set<string>();

  while (completed.size < def.steps.length) {
    const ready = def.steps.filter(s =>
      !completed.has(s.id) &&
      (!s.depends_on || s.depends_on.every(d => completed.has(d)))
    );

    if (ready.length === 0) break;

    for (const step of ready) {
      await executeStep(ctx, step, woId);
      completed.add(step.id);

      await supabase
    .from('wo_workflow_instances')
    .update({
      current_step: step.id,
      steps_completed: completed.size,
          updated_at: new Date().toISOString(),
        })
        .eq('correlation_id', ctx.workOrder.correlation_id);
    }
  }
}

async function executeStep(ctx: WorkflowExecutionContext, step: WorkflowStep, woId: string): Promise<void> {
  switch (step.action) {
    case 'create_job_order': {
      const orgMap = findTargetOrg(ctx, step);
      if (!orgMap) throw new Error(`No target org found for step ${step.id}`);

      for (const item of ctx.items) {
        const joNum = `JO-${ctx.workOrder.wo_number}-${String(step.jo_type).substring(0, 3)}-${item.line_number}`;

        const { error } = await supabase
    .from('wo_job_orders')
    .insert({
            correlation_id: ctx.workOrder.correlation_id,
            tenant_id: ctx.tenantId,
            work_order_id: woId,
            work_order_item_id: item.id,
            originating_org_id: ctx.workOrder.originating_org_id,
            executing_org_id: orgMap.org_id,
            assigned_warehouse_id: orgMap.warehouse_id || undefined,
            jo_number: joNum,
            jo_type: step.jo_type as string,
            sequence_order: getStepIndex(ctx.workOrder.wo_type, step.id),
            status: 'PENDING',
            sla_minutes: step.sla_minutes || undefined,
            requires_approval: step.requires_approval || false,
          });

        if (error) throw error;

        await (supabase
    .from('wo_job_order_items' as any) as any)
    .insert({
            job_order_id: undefined,
            tenant_id: ctx.tenantId,
            product_sku_id: item.product_sku_id || undefined,
            requested_quantity: item.requested_quantity || undefined,
            from_bin_id: step.jo_type === 'PICKING' ? (item.from_bin_id || undefined) : undefined,
            to_bin_id: step.jo_type === 'PUTAWAY' ? (item.to_bin_id || undefined) : undefined,
            batch_number: item.batch_number || undefined,
            expiry_date: item.expiry_date || undefined,
          });
      }
      break;
    }

    default:
      console.warn(`Unknown workflow action: ${step.action}`);
  }
}

function findTargetOrg(ctx: WorkflowExecutionContext, step: WorkflowStep): OrgMappingResult | null {
  if (!step.target_org_type) return null;

  if (step.jo_type === 'PICKING' || step.jo_type === 'LOADING') {
    return ctx.orgMapping['source'] || null;
  }
  if (step.jo_type === 'UNLOADING' || step.jo_type === 'PUTAWAY') {
    return ctx.orgMapping['destination'] || null;
  }
  if (step.jo_type === 'TRUCKING') {
    return ctx.orgMapping['trucking'] || null;
  }

  return ctx.orgMapping['source'] || null;
}

function getStepIndex(woType: string, stepId: string): number {
  const def = getWorkflowForWoType(woType);
  if (!def) return 0;
  return def.steps.findIndex(s => s.id === stepId) + 1;
}

async function resolveOrgMapping(wo: WorkOrder): Promise<Record<string, OrgMappingResult>> {
  const mapping: Record<string, OrgMappingResult> = {};

  const sourceOrgId = wo.originating_org_id;
  const assignedOrgId = wo.assigned_org_id || sourceOrgId;

  mapping['source'] = { org_id: sourceOrgId };
  mapping['destination'] = { org_id: assignedOrgId };
  mapping['trucking'] = { org_id: sourceOrgId };

  return mapping;
}

async function startWorkflowInstance(wo: WorkOrder, def: WorkflowDefinition): Promise<void> {
  const { error } = await supabase
    .from('wo_workflow_instances')
    .insert({
      tenant_id: wo.tenant_id,
      correlation_id: wo.correlation_id,
      workflow_name: def.name,
      workflow_version: def.version,
      trigger_entity_type: 'WORK_ORDER',
      trigger_entity_id: wo.id,
      status: 'RUNNING',
      current_step: def.steps[0]?.id || undefined,
      steps_total: def.steps.length,
      context: { wo_id: wo.id, wo_type: wo.wo_type },
    });
  if (error) throw error;
}

async function completeWorkflowInstance(correlationId: string): Promise<void> {
  const { error } = await supabase
    .from('wo_workflow_instances')
    .update({
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('correlation_id', correlationId);
  if (error) throw error;
}
