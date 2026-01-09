import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate("/signup");
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/verify-otp/", { email, otp });
      login(res.data.tokens, res.data.user);
      toast.success("Email verified! Welcome to BingeBuddy.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post("/auth/resend-otp/", { email });
      toast.success("New OTP sent to your email.");
      setResendCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not resend OTP.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600/20 border border-green-500/30 rounded-2xl
                        flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-green-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Verify Your Email</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            We sent a 6-digit code to <span className="text-gray-900 dark:text-white font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="card space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              maxLength={6}
              className="input-field text-center text-2xl tracking-[0.5em] font-mono"
            />
          </div>

          <button type="submit" disabled={loading || otp.length !== 6}
                  className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm text-brand-400 hover:text-brand-300 disabled:text-gray-400 dark:disabled:text-gray-600"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
