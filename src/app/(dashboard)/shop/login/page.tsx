"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { getAppUser } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { Store } from "lucide-react";

export default function ShopLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Fill all fields"); return; }
    if (Date.now() < lockedUntil) {
      toast.error("Too many attempts. Please wait before trying again.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      const { getAuth } = await import("firebase/auth");
      const firebaseUser = getAuth().currentUser;
      if (!firebaseUser) throw new Error("Auth failed");

      const appUser = await getAppUser(firebaseUser.uid);
      if (!appUser || appUser.role !== "shop_owner") {
        toast.error("Access denied");
        const { signOut } = await import("firebase/auth");
        await signOut(getAuth());
        setLoading(false);
        return;
      }
      setAttempts(0);
      toast.success("Welcome back!");
      router.push("/shop/dashboard");
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 60000);
        toast.error("Too many failed attempts. Please wait 1 minute.");
      } else {
        toast.error("Login failed. Please check your credentials.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 text-white mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Shop Login</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your orders and menu</p>
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-400">
          <Link href="/" className="hover:text-brand-500">Back to home</Link>
        </div>
      </Card>
    </div>
  );
}
