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
    features: ["5 datasets","10,000 rows per dataset","20 AI queries / day","Auto-generated dashboards","CSV & PDF export"],
    cta: "Current Plan", ctaDisabled: true,
  },
  {
    id: "pro", name: "Pro", price: "$49", period: "/month",
    description: "For growing teams that need more power",
    features: ["50 datasets","500,000 rows per dataset","500 AI queries / day","Drag-and-drop dashboard editor","Team members (unlimited)","CSV & PDF export","Priority support"],
    cta: "Upgrade to Pro", popular: true,
  },
  {
    id: "enterprise", name: "Enterprise", price: "$199", period: "/month",
    description: "For large organizations with advanced needs",
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
    try { const res = await billingApi.createCheckout(planId); window.location.href = res.data.checkout_url; }
    catch (e) { setError(getErrorMessage(e)); setLoading(null); }
  };
  const handlePortal = async () => {
    setPortalLoading(true);
    try { const res = await billingApi.createPortalSession(); window.location.href = res.data.portal_url; }
    catch (e) { setError(getErrorMessage(e)); setPortalLoading(false); }
  };

  return (
    <div className="max-w-5xl space-y-lg">
      <div>
        <h1 className="text-headline-lg font-bold" style={{ color: "var(--on-surface)" }}>Billing & Plans</h1>
        <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>Currently on the <span className="font-medium capitalize" style={{ color: "var(--primary)" }}>{currentPlan}</span> plan</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--tertiary-container)", color: "var(--on-tertiary-container)" }}>
          <CheckCircle className="w-5 h-5 shrink-0" /><p className="font-medium">Subscription activated! Your plan has been upgraded.</p>
        </div>
      )}
      {canceled && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--surface-container)", color: "var(--on-surface)" }}>
          <XCircle className="w-5 h-5 shrink-0" /><p>Checkout was canceled. No charges were made.</p>
        </div>
      )}
      {error && <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} className="relative glass-card rounded-xl overflow-hidden flex flex-col">
              {plan.popular && (
                <div className="absolute top-3 right-3 z-10">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>Most Popular</span>
                </div>
              )}
              <div className="px-lg py-lg" style={{ backgroundColor: "var(--surface-container)" }}>
                <h3 className="font-title-md font-bold" style={{ color: "var(--on-surface)" }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>{plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--on-surface-variant)" }}>{plan.period}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>{plan.description}</p>
              </div>
              <div className="p-lg flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--tertiary)" }} />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleUpgrade(plan.id)} disabled={isCurrent || plan.ctaDisabled || loading === plan.id}
                  className={`mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    isCurrent ? "cursor-default opacity-60" : ""
                  }`}
                  style={isCurrent ? { backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" } : { backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
                  {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isCurrent ? "Current Plan" : plan.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {currentPlan !== "free" && (
        <div className="flex items-center justify-between p-lg rounded-xl" style={{ backgroundColor: "var(--surface-container-low)", border: "1px solid var(--outline-variant)" }}>
          <div>
            <p className="font-medium" style={{ color: "var(--on-surface)" }}>Manage Subscription</p>
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>Update payment method, cancel, or change plan via Stripe portal</p>
          </div>
          <button onClick={handlePortal} disabled={portalLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95"
            style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Manage via Stripe
          </button>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>}>
      <BillingContent />
    </Suspense>
  );
}
