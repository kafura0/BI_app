"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { billingApi, getErrorMessage } from "@/lib/api";
import { loadAuth } from "@/lib/auth";

const PLANS = [
  {
    id: "free", name: "Free", price: "$0", period: "forever",
    description: "Perfect for individuals and small experiments",
    color: "border-slate-700", headerColor: "bg-slate-800",
    features: ["5 datasets","10,000 rows per dataset","20 AI queries / day","Auto-generated dashboards","CSV & PDF export"],
    cta: "Current Plan", ctaDisabled: true,
  },
  {
    id: "pro", name: "Pro", price: "$49", period: "/month",
    description: "For growing teams that need more power",
    color: "border-indigo-600", headerColor: "bg-indigo-600",
    features: ["50 datasets","500,000 rows per dataset","500 AI queries / day","Drag-and-drop dashboard editor","Team members (unlimited)","CSV & PDF export","Priority support"],
    cta: "Upgrade to Pro", popular: true,
  },
  {
    id: "enterprise", name: "Enterprise", price: "$199", period: "/month",
    description: "For large organizations with advanced needs",
    color: "border-amber-500", headerColor: "bg-amber-600",
    features: ["Unlimited datasets","10M rows per dataset","9,999 AI queries / day","Custom AI model configuration","SSO / SAML","Dedicated support","SLA guarantee"],
    cta: "Upgrade to Enterprise",
  },
];

function BillingContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const auth = loadAuth();
  const currentPlan = auth?.organization?.plan ?? "free";
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (planId === "free") return;
    setLoading(planId); setError(null);
    try {
      const res = await billingApi.createCheckout(planId);
      window.location.href = res.data.checkout_url;
    } catch (e) { setError(getErrorMessage(e)); setLoading(null); }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try { const res = await billingApi.createPortalSession(); window.location.href = res.data.portal_url; }
    catch (e) { setError(getErrorMessage(e)); setPortalLoading(false); }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
        <p className="text-slate-400 text-sm mt-0.5">Currently on the <span className="text-indigo-400 font-medium capitalize">{currentPlan}</span> plan</p>
      </div>
      {success && (<div className="mb-6 flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400"><CheckCircle className="w-5 h-5 shrink-0" /><p className="font-medium">Subscription activated! Your plan has been upgraded.</p></div>)}
      {canceled && (<div className="mb-6 flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl text-slate-400"><XCircle className="w-5 h-5 shrink-0" /><p>Checkout was canceled. No charges were made.</p></div>)}
      {error && (<div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>)}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} className={`relative bg-slate-900 border-2 ${plan.color} rounded-2xl overflow-hidden flex flex-col`}>
              {(plan as any).popular && (<div className="absolute top-3 right-3"><span className="text-xs font-semibold text-white bg-indigo-600 px-2 py-0.5 rounded-full">Most Popular</span></div>)}
              <div className={`${plan.headerColor} px-6 py-5`}>
                <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1"><span className="text-3xl font-bold text-white">{plan.price}</span><span className="text-white/70 text-sm">{plan.period}</span></div>
                <p className="text-white/70 text-sm mt-1">{plan.description}</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1">{plan.features.map((f) => (<li key={f} className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{f}</li>))}</ul>
                <button onClick={() => handleUpgrade(plan.id)} disabled={isCurrent || (plan as any).ctaDisabled || loading === plan.id}
                  className={`mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isCurrent ? "bg-slate-800 text-slate-500 cursor-default" : plan.id === "pro" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : plan.id === "enterprise" ? "bg-amber-600 hover:bg-amber-500 text-white" : "bg-slate-700 text-slate-400 cursor-default"}`}>
                  {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isCurrent ? "Current Plan" : plan.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {currentPlan !== "free" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div><p className="text-white font-medium">Manage Subscription</p><p className="text-slate-400 text-sm mt-0.5">Update payment method, cancel, or change plan via Stripe portal</p></div>
          <button onClick={handlePortal} disabled={portalLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors">
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Manage via Stripe
          </button>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
      <BillingContent />
    </Suspense>
  );
}
