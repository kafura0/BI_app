"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { slugify } from "@/lib/utils";

const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Min 8 characters").regex(/\d/, "Must contain a digit"),
  org_name: z.string().min(2, "Organization name required"),
  org_slug: z.string().min(4, "Slug must be at least 4 characters").regex(/^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$/, "Lowercase letters, numbers, hyphens only"),
});
type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { register: registerUser, isLoading, error } = useAuth();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const orgName = watch("org_name");
  useEffect(() => { if (orgName) setValue("org_slug", slugify(orgName)); }, [orgName, setValue]);

  const onSubmit = (data: SignupForm) =>
    registerUser({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      organization: { name: data.org_name, slug: data.org_slug },
    });

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--surface-dim)" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full opacity-[0.03]" style={{ backgroundColor: "var(--primary)" }}></div>
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-lg">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ backgroundColor: "var(--primary-container)" }}>
            <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--on-primary-container)" }}>bar_chart</span>
          </div>
          <h1 className="text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>Create your workspace</h1>
          <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>Free plan — no credit card required</p>
        </div>

        <div className="glass-card rounded-2xl p-xl md:p-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Full Name</label>
              <input {...register("full_name")} placeholder="Jane Smith"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
              {errors.full_name && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Work Email</label>
              <input {...register("email")} type="email" placeholder="jane@company.com"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
              {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Password</label>
              <input {...register("password")} type="password" placeholder="Min 8 characters, 1 digit"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
              {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.password.message}</p>}
            </div>

            <div style={{ borderTop: "1px solid var(--outline-variant)" }} className="pt-4">
              <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Organization Name</label>
              <input {...register("org_name")} placeholder="Acme Corp"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
              {errors.org_name && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.org_name.message}</p>}
            </div>

            <div>
              <label className="block text-label-md mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Workspace URL</label>
              <div className="flex">
                <span className="text-sm px-4 py-3 rounded-l-xl" style={{ backgroundColor: "var(--surface-variant)", border: "1px solid var(--outline-variant)", borderRight: "none", color: "var(--on-surface-variant)" }}>app/</span>
                <input {...register("org_slug")} placeholder="acme-corp"
                  className="flex-1 px-4 py-3 rounded-r-xl text-sm"
                  style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
              </div>
              {errors.org_slug && <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{errors.org_slug.message}</p>}
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 text-sm mt-2"
              style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating workspace...</> : "Create Workspace"}
            </button>
          </form>

          <p className="mt-lg text-center text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
