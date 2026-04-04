import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function PaymentFailurePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white dark:bg-[#1a1b2e] rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl p-8 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Failed
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Your eSewa payment was not completed. No charges were made.
          Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/subscribe")}
            className="btn-primary text-sm px-6 py-2.5"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-secondary text-sm px-6 py-2.5"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
