import { enqueueMutation, syncOutboxQueueToCloud } from './offlineSyncEngine';
import { toast } from 'react-hot-toast';

export async function executeWarehouseAction(
  action: string,
  data: any,
  tenantId: string,
  userId?: string
) {
  try {
    // Always push to the outbox queue first
    await enqueueMutation(
      'WAREHOUSE_ACTION',
      { action, data },
      tenantId,
      userId
    );

    // If online, immediately try to sync
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      const { failedCount } = await syncOutboxQueueToCloud();
      if (failedCount > 0) {
        toast.error('Data tersimpan offline. Beberapa sinkronisasi gagal.');
      }
    } else {
      toast.success('Offline: Data disimpan dan akan disinkronisasi saat online.');
    }
  } catch (err: any) {
    console.error('Failed to execute warehouse action:', err);
    toast.error('Terjadi kesalahan saat memproses data lokal.');
    throw err;
  }
}
