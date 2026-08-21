// [AI] Server-side Web Push sender using web-push library
import webPush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './vapid-config';

// [AI] Setup VAPID details — wrapped in try-catch for idempotent initialization
try {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  // Already configured or missing keys — safe to ignore
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  vibrate?: number[];
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscriptionData | any,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (err: any) {
    console.error('[Push] Send failed:', err.message);
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }
    return { success: false, error: err.message };
  }
}
