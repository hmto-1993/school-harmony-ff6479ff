import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-qy7qGkJQ3Di4JNiL7dUCr4eOJagfFjFn5rIjo';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(studentId?: string, classId?: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisuallyIndicatesPermission: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = subscription.toJSON();
    
    await (supabase as any).from("push_subscriptions").upsert({
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
      student_id: studentId || null,
      class_id: classId || null,
      user_type: studentId ? 'student' : 'teacher',
    }, { onConflict: 'endpoint' });
    
    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getNotificationPermission(): string {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function sendPushNotification(
  title: string,
  body: string,
  classIds?: string[]
): Promise<void> {
  await supabase.functions.invoke('send-push-notification', {
    body: { title, body, classIds },
  });
}
