"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BarChart3, Loader2, CheckCircle2 } from "lucide-react";
import { authApi, getErrorMessage } from "@/lib/api";

const resetSchema = z.object({
  password: z.string().min(8, "Min 8 characters").regex(/\d/, "Must contain a digit"),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});
type ResetForm = z.infer<typeof resetSchema>;

function ResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      setError("Missing reset token");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
        <p className="text-red-300 text-sm">Invalid or missing reset token</p>
        <p className="mt-4">
          <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 font-medium text-sm">
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
      {done ? (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600/20 rounded-full mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-slate-300 text-sm mb-4">Your password has been reset successfully</p>
          <Link
            href="/login"
            className="inline-block py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
              <input
                {...register("password")}
                type="password"
                autoComplete="new-password"
                placeholder="Min 8 chars, 1 digit"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <input
                {...register("confirm_password")}
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.confirm_password && <p className="mt-1 text-xs text-red-400">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : "Reset Password"}
            </button>
          </form>
        </>
      )}

      {!done && (
        <p className="mt-6 text-center text-sm text-slate-400">
          Remember your password?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xl font-bold">BI Platform</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-slate-400 mt-1">Enter your new password below</p>
        </div>
        <Suspense fallback={<div className="h-64 bg-white/10 rounded-2xl animate-pulse" />}>
          <ResetContent />
        </Suspense>
      </div>
    </div>
  );
}
