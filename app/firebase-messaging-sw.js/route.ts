import { getNexusPublicRuntimeConfig } from "@/lib/runtime/config";

export async function GET() {
  const config = getNexusPublicRuntimeConfig().firebase;
  if (!config.messagingSenderId || !config.apiKey || !config.projectId || !config.appId) {
    return new Response("Web messaging is not configured.", { status: 503 });
  }
  const script = `
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL("/app/notifications", self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url === target) return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});
importScripts("https://www.gstatic.com/firebasejs/13.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging-compat.js");
firebase.initializeApp(${JSON.stringify(config)});
firebase.messaging().onBackgroundMessage(payload => {
  const data = payload.data || {};
  const expiry = Date.parse(data.expiresAt || "");
  if (!/^[0-9a-f-]{36}$/i.test(data.notificationId || "") || !Number.isFinite(expiry) || expiry <= Date.now()) return;
  return self.registration.showNotification("Your brief is ready", {
    body: "Sign in to NEXUS to view your brief.", tag: data.notificationId, renotify: false,
  });
});`;
  return new Response(script, { headers: {
    "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store",
    "Service-Worker-Allowed": "/", "X-Content-Type-Options": "nosniff",
  } });
}
