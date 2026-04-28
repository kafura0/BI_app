"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Loader2, CheckCircle, XCircle } from "lucide-react";
import { teamApi, getErrorMessage } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

function AcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const loggedIn = isAuthenticated();

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("No invite token provided."); return; }
    if (!loggedIn) return;
    setStatus("loading");
    teamApi.acceptInvite(token)
      .then(() => { setStatus("success"); setTimeout(() => router.push("/dashboard"), 2000); })
      .catch((e) => { setStatus("error"); setMessage(getErrorMessage(e)); });
  }, [token, loggedIn, router]);

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-10 text-center max-w-sm w-full">
      {!loggedIn && status === "idle" && (
        <>
          <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-6 h-6 text-indigo-400" /></div>
          <h2 className="text-white text-xl font-bold mb-2">You&apos;ve been invited!</h2>
          <p className="text-slate-400 text-sm mb-6">Sign in or create an account to accept this invitation.</p>
          <div className="space-y-3">
            <Link href={`/login?redirect=/accept-invite?token=${token}`} className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-sm">Sign In</Link>
            <Link href={`/signup?redirect=/accept-invite?token=${token}`} className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm">Create Account</Link>
          </div>
        </>
      )}
      {status === "loading" && (<><Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" /><p className="text-white">Accepting invitation...</p></>)}
      {status === "success" && (<><CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" /><h2 className="text-white text-xl font-bold mb-2">Welcome to the team!</h2><p className="text-slate-400 text-sm">Redirecting to your dashboard...</p></>)}
      {status === "error" && (<><XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" /><h2 className="text-white text-xl font-bold mb-2">Invite failed</h2><p className="text-slate-400 text-sm mb-6">{message}</p><Link href="/dashboard" className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm">Go to Dashboard</Link></>)}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <AcceptContent />
      </Suspense>
    </div>
  );
}
