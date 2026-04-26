import { auth } from "./firebase";

/**
 * Get Authorization header with Firebase ID token for authenticated API calls
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return { "Content-Type": "application/json" };

  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
