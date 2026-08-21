import { supabase } from './client';

export type NotificationType = {
  title: string;
  message: string;
  link?: string;
  role?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
};

export async function sendNotification(
  tenantId: string,
  notif: NotificationType
) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: notif.user_id,
      role: notif.role,
      title: notif.title,
      message: notif.message,
      type: String(notif.metadata?.type || 'info'),
      is_read: false,
      metadata: {
        ...(notif.metadata || {}),
        link: notif.link,
        tenant_id: tenantId
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[NotificationUtil] Error sending notification:', err);
    return { success: false, error: err };
  }
}
