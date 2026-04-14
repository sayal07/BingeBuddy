import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, KeyRound, Loader2, Tv, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1 = email, 2 = OTP + new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password/", { email });
      toast.success("Reset code sent! Check your email.");
      setStep(2);
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password/", {
        email,
        otp,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      toast.success("Password reset successfully!");
      navigate("/login");
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.error || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {step === 1
                ? "Enter your email and we'll send a reset code"
                : "Enter the code from your email and your new password"}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="card space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="input-field pl-11"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? "Sending..." : "Send Reset Code"}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                <Link
                  to="/login"
                  className="text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="card space-y-5">
              {/* Email display */}
              <div className="flex items-center gap-2 bg-brand-600/10 text-brand-400 rounded-xl px-4 py-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Code sent to <span className="font-semibold">{email}</span>
              </div>

              {/* OTP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Reset Code (OTP)
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 6-digit code"
                  required
                  maxLength={6}
                  className="input-field text-center font-mono text-lg tracking-[0.3em]"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="input-field pl-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={8}
                    className="input-field pl-11"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  otp.length !== 6 ||
                  !newPassword ||
                  !confirmPassword
                }
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Email
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
