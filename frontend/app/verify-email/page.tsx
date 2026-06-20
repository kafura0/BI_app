"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { authApi, getErrorMessage } from "@/lib/api";
import { patchStoredUser } from "@/lib/auth";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!token) { setStatus("error"); setMessage("No verification token provided."); return; }
    authApi.verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        patchStoredUser({ email_verified: true });
        setStatus("success");
      })
      .catch((e) => { if (!cancelled) { setStatus("error"); setMessage(getErrorMessage(e)); } });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-10 text-center max-w-sm w-full">
      {status === "loading" && (
        <><Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" /><p className="text-white">Verifying...</p></>
      )}
      {status === "success" && (
        <>
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Email verified!</h2>
          <p className="text-slate-400 text-sm mb-6">Your account is now fully activated.</p>
          <Link href="/dashboard" className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-sm">Go to Dashboard</Link>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Verification failed</h2>
          <p className="text-slate-400 text-sm mb-6">{message || "The link is invalid or has expired."}</p>
          <Link href="/dashboard" className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm">Back to Dashboard</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
