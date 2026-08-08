import { createAdminClient } from '@/lib/supabase/admin';
import { OperationalContext } from '../../platforms/copilot/context/OperationalContext';
import { TenantContext } from '../../platforms/copilot/context/TenantContext';
import { UserContext } from '../../platforms/copilot/context/UserContext';
import { PermissionContext } from '../../platforms/copilot/context/PermissionContext';
import { ConversationContext } from '../../platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '../../platforms/copilot/context/WorkspaceContext';

export class WhatsAppContextBuilder {
    /**
     * Attempts to resolve a WhatsApp number to a Sentralogis OperationalContext.
     * Prioritizes matching against drivers first.
     */
    static async buildContext(waNumber: string): Promise<OperationalContext | null> {
        const supabase = createAdminClient();

        // 1. Try to find as a Driver
        const { data: driver, error: driverErr } = await supabase
            .from('md_drivers')
            .select('id, name, tenant_id')
            .or(`whatsapp.eq.${waNumber},phone.eq.${waNumber}`)
            .maybeSingle();

        if (driverErr) {
            console.error('Error resolving WA number to driver:', driverErr);
            return null;
        }

        if (driver) {
            const tenantCtx = TenantContext.create({ id: driver.tenant_id || 'system', timezone: 'Asia/Jakarta' });
            const userCtx = UserContext.create({ id: driver.id, displayName: driver.name, roles: ['DRIVER'] });
            const permCtx = PermissionContext.create(['DRIVER_OPERATIONS']);
            const convCtx = ConversationContext.create({ conversationId: waNumber });
            const wsCtx = WorkspaceContext.create({ activeDriver: driver.id }).pin('DRIVER', driver.id);

            return OperationalContext.create({
                tenant: tenantCtx,
                user: userCtx,
                permissions: permCtx,
                conversation: convCtx,
                workspace: wsCtx
            });
        }

        console.log(`No context could be resolved for WA number: ${waNumber}`);
        return null;
    }
}
