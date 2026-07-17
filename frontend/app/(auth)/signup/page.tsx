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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-dim text-on-surface">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full mix-blend-screen blur-[100px] opacity-20 animate-blob bg-primary-container"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full mix-blend-screen blur-[120px] opacity-20 animate-blob bg-tertiary-container" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 rounded-full mix-blend-screen blur-[100px] opacity-10 animate-blob bg-secondary-container" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-md p-xs md:p-0 z-10 relative">
        <div className="glass-panel rounded-xl p-8 md:p-xl flex flex-col gap-xl">
          {/* Brand Logo & Header */}
          <div className="flex flex-col items-center gap-md text-center">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-tertiary flex items-center justify-center mb-sm shadow-[0_0_20px_rgba(192,193,255,0.2)]">
              <span className="material-symbols-outlined text-[20px] text-surface-container-lowest" style={{ fontVariationSettings: "'FILL' 1" }}>
                analytics
              </span>
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg mb-xs tracking-tight text-on-surface">Create your workspace</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Free plan — no credit card required</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
            {error && (
                <div className="p-3 rounded-lg text-sm bg-error-container text-on-error-container">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Full Name</label>
                <input {...register("full_name")} placeholder="Jane Smith"
                  className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md placeholder:text-outline-variant text-on-surface" />
                {errors.full_name && <p className="text-xs text-error">{errors.full_name.message}</p>}
              </div>

              <div className="flex flex-col gap-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Work Email</label>
                <input {...register("email")} type="email" placeholder="jane@company.com"
                  className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md placeholder:text-outline-variant text-on-surface" />
                {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
              </div>

              <div className="flex flex-col gap-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Password</label>
                <input {...register("password")} type="password" placeholder="Min 8 characters, 1 digit"
                  className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md placeholder:text-outline-variant text-on-surface" />
                {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-md border-t border-outline-variant">
              <div className="flex flex-col gap-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Organization Name</label>
                <input {...register("org_name")} placeholder="Acme Corp"
                  className="input-glass w-full rounded-lg px-4 py-3 font-body-md text-body-md placeholder:text-outline-variant text-on-surface" />
                {errors.org_name && <p className="text-xs text-error">{errors.org_name.message}</p>}
              </div>

              <div className="flex flex-col gap-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Workspace URL</label>
                <div className="flex">
                  <span className="text-body-md px-4 py-3 rounded-l-lg flex items-center bg-surface-variant border border-outline-variant border-r-0 text-on-surface-variant">app/</span>
                  <input {...register("org_slug")} placeholder="acme-corp"
                    className="input-glass flex-1 px-4 py-3 rounded-r-lg font-body-md text-body-md placeholder:text-outline-variant text-on-surface" />
                </div>
                {errors.org_slug && <p className="text-xs text-error">{errors.org_slug.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full rounded-lg py-3 font-label-sm text-label-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating workspace...</>
              ) : (
                <>Create Workspace <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="text-center mt-2">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="font-label-sm text-label-sm transition-colors text-primary">Sign in</Link>
            </p>
          </div>
        </div>

        {/* Minimalistic Footer */}
        <div className="mt-8 text-center">
          <p className="font-mono-sm text-mono-sm text-outline-variant">
            Secure access for JOAT Intelligence Platform
          </p>
        </div>
      </main>
    </div>
  );
}
