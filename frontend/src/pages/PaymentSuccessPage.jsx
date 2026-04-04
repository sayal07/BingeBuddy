import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, Loader2 } from "lucide-react";
import api from "../utils/api";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      // eSewa redirects with base64-encoded data in the URL query
      const data = searchParams.get("data");

      if (!data) {
        setError("No payment data received.");
        setVerifying(false);
        return;
      }

      try {
        await api.post("/payments/verify/", { data });
        await refreshProfile();
        setVerifying(false);
      } catch (err) {
        setError(err.response?.data?.error || "Payment verification failed.");
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, refreshProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white dark:bg-[#1a1b2e] rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl p-8 text-center max-w-md w-full">
        {verifying ? (
          <>
            <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">
              Verifying Payment...
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Please wait while we confirm your eSewa payment.
            </p>
          </>
        ) : error ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate("/subscribe")}
              className="btn-primary text-sm px-6 py-2.5"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Successful! 🎉
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Your BingeBuddy Premium subscription is now active.
              Enjoy unlimited watch parties!
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-primary text-sm px-6 py-2.5"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
