import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Crown, Check, Zap, Shield, Loader2 } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: 99,
    period: "month",
    features: [
      "Unlimited watch parties",
      "Voice chat with friends",
      "AI Movie Explorer",
      "Local video hosting",
      "Custom themes",
    ],
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 999,
    period: "year",
    badge: "Save 16%",
    features: [
      "Everything in Monthly",
      "Priority support",
      "Early access to features",
      "Extended room capacity",
      "Ad-free forever",
    ],
  },
];

export default function SubscriptionPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    // Only redirect away if they already have a PAID subscription.
    // Trial users should be allowed to view this page to upgrade.
    if (user?.is_subscribed) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubscribe = async (planId) => {
    setLoading(planId);
    try {
      const res = await api.post("/payments/initiate/", { plan: planId });
      const { payment_url, form_data } = res.data;

      // Create a hidden form and submit to eSewa
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payment_url;

      Object.entries(form_data).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      toast.error("Failed to initiate payment. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-600/10 text-brand-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Crown className="w-4 h-4" /> Upgrade to Premium
          </div>
          <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Your free trial has ended
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Continue enjoying BingeBuddy with all features unlocked.
            Pay securely with <span className="text-green-500 font-semibold">eSewa</span>.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-[#1a1b2e] rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${
                plan.id === "yearly"
                  ? "border-brand-500 shadow-lg shadow-brand-500/10"
                  : "border-gray-200 dark:border-white/10"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 right-6 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  Rs. {plan.price}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  /{plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  plan.id === "yearly"
                    ? "bg-brand-600 hover:bg-brand-700 text-white"
                    : "bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {loading === plan.id ? "Redirecting to eSewa..." : `Pay with eSewa`}
              </button>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            Secure payment via eSewa
          </div>
          <div>Cancel anytime</div>
          <div>Instant activation</div>
        </div>
      </div>
    </div>
  );
}
