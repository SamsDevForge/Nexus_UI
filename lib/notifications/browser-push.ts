"use client";

import type { NexusApiClient } from "@/lib/api/client";
import type { NotificationService } from "@/lib/services/notification-service";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const storageKey = (userId: string) => `nexus-push-device:${userId}`;

export async function enableBrowserPush(service: NotificationService, userId: string, vapidKey: string) {
  if (!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Push needs a supported browser and HTTPS (or localhost).");
  }
  if (!getApp().options.messagingSenderId) {
    throw new Error("Firebase web messaging is not configured for this browser.");
  }
  // Start the permission request in the click task, before asynchronous module loading.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Browser notification permission was not granted. You can still use the inbox.");
  const messaging = await import("firebase/messaging");
  if (!await messaging.isSupported()) throw new Error("Firebase messaging is not supported in this browser.");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const instance = messaging.getMessaging(getApp());
  try {
    let stop = () => {};
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const fid = await new Promise<string>((resolve, reject) => {
      stop = messaging.onRegistered(instance, resolve);
      timeout = setTimeout(() => reject(new Error("Push registration timed out. Please retry.")), 20_000);
      void messaging.register(instance, { vapidKey, serviceWorkerRegistration: registration }).catch(reject);
    }).finally(() => { stop(); if (timeout) clearTimeout(timeout); });
    if (getAuth(getApp()).currentUser?.uid !== userId) throw new Error("The signed-in account changed. Please enable push again from that account.");
    const device = await service.register(fid);
    try { localStorage.setItem(storageKey(userId), device.id); } catch { /* Optional device-id hint only. */ }
    return device;
  } catch (error) {
    await messaging.unregister(instance).catch(() => {});
    throw error;
  }
}

export async function revokeBrowserPush(client: NexusApiClient, userId: string, deviceId?: string) {
  let localId: string | null = null;
  try { localId = localStorage.getItem(storageKey(userId)); } catch { /* Storage may be disabled. */ }
  const target = deviceId || localId;
  let failure: unknown;
  // Attempt both revocation paths even if one network is unavailable.
  try {
    if (target) await client.request(`/api/v1/notifications/devices/${encodeURIComponent(target)}`, { method: "DELETE" });
  } catch (error) { failure = error; }
  if (!deviceId || deviceId === localId) {
    try {
      const [{ getApp }, messaging] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
      if (await messaging.isSupported() && getApp().options.messagingSenderId) await messaging.unregister(messaging.getMessaging(getApp()));
      try { localStorage.removeItem(storageKey(userId)); } catch { /* No token is stored here. */ }
    } catch (error) { failure ??= error; }
  }
  if (failure) throw failure;
}

export async function observeForegroundBriefs(callback: () => void) {
  const [{ getApp }, messaging] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
  if (!await messaging.isSupported() || Notification.permission !== "granted" || !getApp().options.messagingSenderId) return () => {};
  return messaging.onMessage(messaging.getMessaging(getApp()), () => callback());
}
