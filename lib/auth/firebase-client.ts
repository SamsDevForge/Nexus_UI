"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { firebaseWebConfig } from "@/lib/runtime/config";

let firebaseApp: FirebaseApp | null = null;

export function getNexusFirebaseAuth(): Auth {
  firebaseApp = getApps()[0] ?? initializeApp(firebaseWebConfig);
  return getAuth(firebaseApp);
}

export function observeFirebaseUser(
  auth: Auth,
  observer: (user: User | null) => void,
) {
  return onAuthStateChanged(auth, observer);
}

export async function signInWithGoogle(auth: Auth) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutFromFirebase(auth: Auth) {
  await signOut(auth);
}
