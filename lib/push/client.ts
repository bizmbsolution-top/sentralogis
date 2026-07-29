// [AI] Client-side push notification subscription helper for Driver PWA

const VAPID_PUBLIC_KEY = 'BJ94bQPSooKkOlv0X_nNKDnTn-Lz-Z1dMbdGE_l4BUytU33H43Kl8nTmBEddnv2MsBWfFWZ3JN-Cliv9fF8oIbc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications(driverId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Push notifications not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const response = await fetch('/api/driver/register-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id: driverId,
        push_subscription: subscription.toJSON(),
        device_fingerprint: navigator.userAgent,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('[Push] Subscription registered for driver:', driverId);
      return true;
    } else {
      console.error('[Push] Registration failed:', result.error);
      return false;
    }
  } catch (err) {
    console.error('[Push] Subscription error:', err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
    return false;
  }
}
