"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { getAppUser, findPendingUserByEmail, claimPendingUser } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { Store } from "lucide-react";

export default function ShopLoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Fill all fields"); return; }
    if (isRegister && password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (Date.now() < lockedUntil) {
      toast.error("Too many attempts. Please wait before trying again.");
      return;
    }
    setLoading(true);
    try {
      // Check if there's a pending invite for this email first
      const pending = await findPendingUserByEmail(email);
      if (isRegister && !pending) {
        toast.error("No shop invite found for this email. Ask your admin to add you.");
        setLoading(false);
        return;
      }

      let firebaseUser;
      if (isRegister) {
        // Register new account
        firebaseUser = await signUp(email, password);
      } else {
        // Sign in existing account
        await signIn(email, password);
        const { getAuth } = await import("firebase/auth");
        firebaseUser = getAuth().currentUser;
      }

      if (!firebaseUser) throw new Error("Auth failed");

      let appUser = await getAppUser(firebaseUser.uid);

      // If no user doc exists, check for a pending invite by email and claim it
      if (!appUser) {
        const pendingUser = pending || await findPendingUserByEmail(email);
        if (pendingUser && pendingUser.data.role === "shop_owner") {
          await claimPendingUser(pendingUser.docId, firebaseUser.uid, pendingUser.data.shopId || "");
          appUser = await getAppUser(firebaseUser.uid);
        }
      }

      if (!appUser || appUser.role !== "shop_owner") {
        toast.error("Not a shop owner account");
        const { getAuth, signOut } = await import("firebase/auth");
        await signOut(getAuth());
        setLoading(false);
        return;
      }
      toast.success(isRegister ? "Account created!" : "Welcome back!");
      router.push("/shop/dashboard");
    } catch (err: unknown) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 60000); // Lock for 1 minute
        toast.error("Too many failed attempts. Please wait 1 minute.");
      } else {
        toast.error("Login failed. Please check your credentials.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-600 text-white mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {isRegister ? "Shop Registration" : "Shop Login"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRegister ? "Create your shop owner account" : "Manage your orders and menu"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="shop@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder={isRegister ? "Min 6 characters" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? (isRegister ? "Creating account..." : "Signing in...") : (isRegister ? "Register" : "Sign In")}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setLoading(false); }}
            className="text-sm text-orange-600 hover:underline"
          >
            {isRegister ? "Already have an account? Sign in" : "First time? Register here"}
          </button>
        </div>
        <div className="mt-4 text-center text-sm text-gray-400">
          <Link href="/" className="hover:text-orange-600">Back to home</Link>
        </div>
      </Card>
    </div>
  );
}
