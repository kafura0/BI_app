"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BarChart3, Loader2 } from "lucide-react";
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
  useEffect(() => {
    if (orgName) setValue("org_slug", slugify(orgName));
  }, [orgName, setValue]);

  const onSubmit = (data: SignupForm) =>
    registerUser({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      organization: { name: data.org_name, slug: data.org_slug },
    });

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
          <h1 className="text-2xl font-bold text-white">Create your workspace</h1>
          <p className="text-slate-400 mt-1">Start your free plan — no credit card required</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input {...register("full_name")} placeholder="Jane Smith" className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Work Email</label>
              <input {...register("email")} type="email" placeholder="jane@company.com" className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input {...register("password")} type="password" placeholder="Min 8 chars, 1 digit" className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="border-t border-white/10 pt-4">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization Name</label>
              <input {...register("org_name")} placeholder="Acme Corp" className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.org_name && <p className="mt-1 text-xs text-red-400">{errors.org_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Workspace URL</label>
              <div className="flex items-center">
                <span className="text-slate-500 text-sm px-3 py-2.5 bg-white/5 border border-white/20 border-r-0 rounded-l-lg">app/</span>
                <input {...register("org_slug")} placeholder="acme-corp" className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-r-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {errors.org_slug && <p className="mt-1 text-xs text-red-400">{errors.org_slug.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating workspace...</> : "Create Workspace"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
