import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { env, requireEnv } from "@/lib/env";

function getFirebaseApp() {
  const existingApp = getApps()[0];
  if (existingApp) {
    return existingApp;
  }

  return initializeApp({
    credential: cert({
      projectId: requireEnv(env.firebaseProjectId, "FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv(env.firebaseClientEmail, "FIREBASE_CLIENT_EMAIL"),
      privateKey: requireEnv(env.firebasePrivateKey, "FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

let messagingInstance: Messaging | undefined;

function getMessagingInstance() {
  if (!messagingInstance) {
    messagingInstance = getMessaging(getFirebaseApp());
  }
  return messagingInstance;
}

export const messaging = {
  sendEachForMulticast: (...args: Parameters<Messaging["sendEachForMulticast"]>) =>
    getMessagingInstance().sendEachForMulticast(...args),
};
