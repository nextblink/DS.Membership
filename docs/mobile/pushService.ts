import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Register device with FCM and send token to backend ──────────────────────

export async function registerPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Skipping — not a native platform');
    return;
  }

  // Request permission
  let permission = await PushNotifications.checkPermissions();

  if (permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    console.warn('[Push] Notification permission denied');
    return;
  }

  await PushNotifications.register();
}

// ─── Listeners — call once on app init ───────────────────────────────────────

export function setupPushListeners(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  // FCM token received — send to backend
  const tokenListener = PushNotifications.addListener('registration', async (token) => {
    console.log('[Push] FCM token received');
    try {
      await fetch(`${API_BASE}/api/notifications/subscribe`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ fcmToken: token.value }),
      });
    } catch (err) {
      console.error('[Push] Failed to register token with backend', err);
    }
  });

  // Registration error
  const errorListener = PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Registration error', err);
  });

  // Notification received while app is in foreground
  const foregroundListener = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification) => {
      console.log('[Push] Foreground notification', notification);
      // Capacitor shows it automatically via presentationOptions in capacitor.config.ts
    }
  );

  // User tapped a notification
  const tapListener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action) => {
      const data = action.notification.data as { route?: string };
      if (data?.route) {
        // Use a custom event so the router can navigate
        window.dispatchEvent(new CustomEvent('push-navigate', { detail: { route: data.route } }));
      }
    }
  );

  // Return cleanup function
  return () => {
    tokenListener.then(l => l.remove());
    errorListener.then(l => l.remove());
    foregroundListener.then(l => l.remove());
    tapListener.then(l => l.remove());
  };
}
