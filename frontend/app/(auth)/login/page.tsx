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
    <div className="glass-card rounded-2xl p-xl md:p-2xl">
      <div className="text-center mb-lg">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ backgroundColor: "var(--primary-container)" }}>
          <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--on-primary-container)" }}>bar_chart</span>
        </div>
        <h1 className="text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>Welcome back</h1>
        <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>Sign in to your workspace</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-md">
        <div>
          <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Email</label>
          <input {...register("email")} type="email" autoComplete="email" placeholder="you@company.com"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
          {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-label-md" style={{ color: "var(--on-surface-variant)" }}>Password</label>
            <Link href="/forgot-password" className="text-xs font-medium" style={{ color: "var(--primary)" }}>Forgot?</Link>
          </div>
          <input {...register("password")} type="password" autoComplete="current-password" placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
          {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 text-sm"
          style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign In"}
        </button>
      </form>

      <p className="mt-lg text-center text-sm" style={{ color: "var(--on-surface-variant)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium" style={{ color: "var(--primary)" }}>Create workspace</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--surface-dim)" }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full opacity-[0.03]" style={{ backgroundColor: "var(--primary)" }}></div>
      </div>
      <div className="w-full max-w-sm">
        <Suspense fallback={
          <div className="glass-card rounded-2xl p-xl flex items-center justify-center" style={{ height: "280px" }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        }>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
