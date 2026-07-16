"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

function LoginContent() {
  const { login, isLoading, error } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => login(data.email, data.password, redirectTo);

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
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs tracking-tight">Welcome Back</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Sign in to your workspace</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-sm">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Email Address</label>
            <input {...register("email")} type="email" autoComplete="email" placeholder="name@company.com"
              className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline-variant" />
            {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-sm">
            <div className="flex justify-between items-center">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Password</label>
              <Link href="/forgot-password" className="font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors">Forgot password?</Link>
            </div>
            <input {...register("password")} type="password" autoComplete="current-password" placeholder="••••••••"
              className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline-variant" />
            {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.password.message}</p>}
          </div>
        </div>
        <button type="submit" disabled={isLoading}
          className="btn-primary w-full rounded-lg py-3 font-label-sm text-label-sm flex items-center justify-center gap-2 disabled:opacity-60">
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
          ) : (
            <>Sign In<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-outline-variant opacity-50"></div>
        <span className="flex-shrink-0 mx-4 font-label-sm text-label-sm text-on-surface-variant">or</span>
        <div className="flex-grow border-t border-outline-variant opacity-50"></div>
      </div>

      {/* Social Auth */}
      <div className="flex flex-col gap-sm">
        <button className="btn-social w-full rounded-lg py-3 px-4 flex items-center justify-center gap-3" type="button">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
          </svg>
          <span className="font-label-sm text-label-sm text-on-surface">Continue with Google</span>
        </button>
        <button className="btn-social w-full rounded-lg py-3 px-4 flex items-center justify-center gap-3" type="button">
          <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect fill="#f25022" height="9" width="9" x="1" y="1"></rect>
            <rect fill="#7fba00" height="9" width="9" x="11" y="1"></rect>
            <rect fill="#00a4ef" height="9" width="9" x="1" y="11"></rect>
            <rect fill="#ffb900" height="9" width="9" x="11" y="11"></rect>
          </svg>
          <span className="font-label-sm text-label-sm text-on-surface">Continue with Microsoft</span>
        </button>
      </div>

      {/* Footer Links */}
      <div className="text-center mt-2">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:text-primary-fixed transition-colors font-label-sm text-label-sm">Sign up</Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
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
            <LoginContent />
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
