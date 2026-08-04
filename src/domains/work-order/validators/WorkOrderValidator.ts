import { z } from 'zod';
import { WorkOrderPriority } from '../types/WorkOrderPriority';
import { WorkOrderType } from '../types/WorkOrderType';

export const CreateWorkOrderSchema = z.object({
  tenantId: z.string().uuid(),
  originatingOrgId: z.string().uuid(),
  assignedOrgId: z.string().uuid().optional(),
  woType: z.nativeEnum(WorkOrderType),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  items: z.array(
    z.object({
      productSkuId: z.string().uuid().optional(),
      itemDescription: z.string().optional(),
      requestedQuantity: z.number().positive(),
      uom: z.string()
    })
  ).min(1, 'At least one item is required')
});

export type CreateWorkOrderDTO = z.infer<typeof CreateWorkOrderSchema>;
