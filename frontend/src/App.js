import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/layout/Navbar";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import DashboardPage from "./pages/DashboardPage";
import WatchRoomPage from "./pages/WatchRoomPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentFailurePage from "./pages/PaymentFailurePage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

/**
 * SubscriptionGuard — wraps routes that require an active subscription.
 * Redirects to /subscribe if trial expired and no paid subscription.
 */
function SubscriptionGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.has_active_subscription) return <Navigate to="/subscribe" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Guest-only */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
      <Route path="/verify-otp" element={<VerifyOTPPage />} />

      {/* Subscription — must be logged in but doesn't require active sub */}
      <Route path="/subscribe" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
      <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
      <Route path="/payment/failure" element={<ProtectedRoute><PaymentFailurePage /></ProtectedRoute>} />

      {/* Protected + requires active subscription */}
      <Route path="/dashboard" element={<SubscriptionGuard><DashboardPage /></SubscriptionGuard>} />
      <Route path="/room/:code" element={<SubscriptionGuard><WatchRoomPage /></SubscriptionGuard>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppLayout() {
  const location = useLocation();
  const isRoomPage = location.pathname.startsWith("/room/");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface-900 text-gray-900 dark:text-dark-text transition-colors">
      {!isRoomPage && <Navbar />}
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: "!bg-white !text-gray-900 !border-gray-200 dark:!bg-[#1a1b2e] dark:!text-[#e9ecef] dark:!border-white/10",
          style: {
            borderRadius: "12px",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

