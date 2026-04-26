/**
 * Seed Script — Run once to set up initial admin + courtyard
 * 
 * Usage:
 *   1. Fill in your Firebase config in .env.local
 *   2. Create an admin user via Firebase Console (Authentication > Add user)
 *   3. Update the values below
 *   4. Run: npx tsx scripts/seed.ts
 * 
 * Or alternatively, use the Firebase Console to manually create:
 *   - A document in `courtyards` collection
 *   - A document in `users` collection for the admin
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

// --- CONFIGURE THESE ---
const ADMIN_UID = process.env.ADMIN_UID || "PASTE_YOUR_ADMIN_UID_HERE";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const COURTYARD_NAME = process.env.COURTYARD_NAME || "XYZ Courtyard";
const COURTYARD_ADDRESS = process.env.COURTYARD_ADDRESS || "123 Food Street, Mumbai";
// -------------------------

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("Missing Firebase config. Ensure .env.local exists with NEXT_PUBLIC_FIREBASE_* vars.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("Seeding...");

  // Create courtyard
  const slug = COURTYARD_NAME.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-");
  const courtyardRef = await addDoc(collection(db, "courtyards"), {
    name: COURTYARD_NAME,
    slug,
    address: COURTYARD_ADDRESS,
    adminUid: ADMIN_UID,
    createdAt: serverTimestamp(),
  });
  console.log("Courtyard created:", courtyardRef.id);

  // Create admin user profile
  await setDoc(doc(db, "users", ADMIN_UID), {
    email: ADMIN_EMAIL,
    displayName: "Admin",
    role: "admin",
    courtyardId: courtyardRef.id,
  });
  console.log("Admin user profile created");

  console.log("\n✅ Done! Your courtyard URL will be: /" + slug);
  console.log("Login at /admin/login with:", ADMIN_EMAIL);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
