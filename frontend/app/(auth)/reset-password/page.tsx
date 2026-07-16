"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2 } from "lucide-react";
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
      <>
        <div className="flex flex-col items-center gap-md text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-tertiary flex items-center justify-center mb-sm shadow-[0_0_20px_rgba(192,193,255,0.2)]">
            <span className="material-symbols-outlined text-surface-container-lowest font-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>
              analytics
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs tracking-tight">Invalid Token</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">The reset link is invalid or has expired.</p>
          </div>
        </div>
        <div className="p-3 rounded-lg text-sm text-center" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
          Invalid or missing reset token
        </div>
        <Link href="/forgot-password"
          className="btn-primary w-full rounded-lg py-3 font-label-sm text-label-sm flex items-center justify-center gap-2">
          Request a new reset link
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
        <div className="text-center mt-2">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Remember your password?{" "}
            <Link href="/login" className="text-primary hover:text-primary-fixed transition-colors font-label-sm text-label-sm">Sign in</Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Brand Logo & Header */}
      <div className="flex flex-col items-center gap-md text-center">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-tertiary flex items-center justify-center mb-sm shadow-[0_0_20px_rgba(192,193,255,0.2)]">
          <span className="material-symbols-outlined text-surface-container-lowest font-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>
            analytics
          </span>
        </div>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs tracking-tight">Reset Password</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Enter your new password below</p>
        </div>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full" style={{ backgroundColor: "var(--tertiary-container)" }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: "var(--on-tertiary-container)" }} />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Your password has been reset successfully</p>
          <Link href="/login"
            className="btn-primary w-full rounded-lg py-3 font-label-sm text-label-sm flex items-center justify-center gap-2">
            Sign In
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">New Password</label>
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 8 chars, 1 digit"
                  className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline-variant"
                />
                {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.password.message}</p>}
              </div>

              <div className="flex flex-col gap-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Confirm Password</label>
                <input
                  {...register("confirm_password")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline-variant"
                />
                {errors.confirm_password && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.confirm_password.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full rounded-lg py-3 font-label-sm text-label-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
              ) : (
                <>Reset Password<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
              )}
            </button>
          </form>

          <div className="text-center mt-2">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Remember your password?{" "}
              <Link href="/login" className="text-primary hover:text-primary-fixed transition-colors font-label-sm text-label-sm">Sign in</Link>
            </p>
          </div>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden text-on-surface" style={{ backgroundColor: "var(--background)" }}>
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-container rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-tertiary-container rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-secondary-container rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-blob" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-md p-margin-mobile md:p-0 z-10 relative">
        <div className="glass-panel rounded-xl p-8 md:p-xl flex flex-col gap-xl">
          <Suspense fallback={
            <div className="flex items-center justify-center" style={{ height: "280px" }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          }>
            <ResetContent />
          </Suspense>
        </div>

        {/* Minimalistic Footer */}
        <div className="mt-8 text-center">
          <p className="font-mono-sm text-mono-sm text-outline-variant">
            Secure access for your workspace
          </p>
        </div>
      </main>
    </div>
  );
}
