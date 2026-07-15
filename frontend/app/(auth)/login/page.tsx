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
    <div className="glass-card rounded-xl p-xl">
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-md">
        <div>
          <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Email</label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}
          />
          {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Password</label>
          <input
            {...register("password")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}
          />
          {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.password.message}</p>}
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-xs font-medium" style={{ color: "var(--primary)" }}>
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
          style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}
        >
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign In"}
        </button>
      </form>

      <p className="mt-lg text-center text-sm" style={{ color: "var(--on-surface-variant)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium" style={{ color: "var(--primary)" }}>
          Create workspace
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--surface-dim)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-lg">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }}>
              <span className="material-symbols-outlined">bar_chart</span>
            </div>
            <span className="text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>BI Platform</span>
          </div>
          <h1 className="text-headline-lg font-bold" style={{ color: "var(--on-surface)" }}>Welcome back</h1>
          <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>Sign in to your workspace</p>
        </div>
        <Suspense fallback={
          <div className="glass-card rounded-xl p-xl flex items-center justify-center" style={{ height: "200px" }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        }>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
