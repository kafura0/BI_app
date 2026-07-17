"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { authApi, getErrorMessage } from "@/lib/api";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden text-on-surface bg-background">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-container rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-tertiary-container rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-secondary-container rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-blob" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-md p-margin-mobile md:p-0 z-10 relative">
        <div className="glass-panel rounded-xl p-8 md:p-xl flex flex-col gap-xl">
          {/* Brand Logo & Header */}
          <div className="flex flex-col items-center gap-md text-center">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-tertiary flex items-center justify-center mb-sm shadow-[0_0_20px_rgba(192,193,255,0.2)]">
              <span className="material-symbols-outlined text-surface-container-lowest font-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                analytics
              </span>
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs tracking-tight">Forgot password</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Enter your email to receive a reset link</p>
            </div>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-md bg-error-container">
                <CheckCircle2 className="w-6 h-6 text-tertiary" />
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                If an account exists, you&apos;ll receive a password reset email
              </p>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg text-sm bg-error-container text-on-error-container">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
                <div className="flex flex-col gap-sm">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Email Address</label>
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline-variant"
                  />
                  {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full rounded-lg py-3 font-label-sm text-label-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <>Send Reset Link<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Footer Link */}
          <div className="text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Remember your password?{" "}
              <Link href="/login" className="text-primary hover:text-primary-fixed transition-colors font-label-sm text-label-sm">
                Sign in
              </Link>
            </p>
          </div>
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
