import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Server-side Firebase client SDK instance (for API routes)
// This avoids needing firebase-admin + service account credentials
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const serverApp =
  getApps().find((a) => a.name === "server") ||
  initializeApp(firebaseConfig, "server");

export const serverDb = getFirestore(serverApp);
