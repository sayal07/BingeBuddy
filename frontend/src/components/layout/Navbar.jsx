import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon, LogOut, User, Tv, AlertTriangle, Menu, X } from "lucide-react";

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const isProfile = location.pathname === "/profile";
  const hideNavLinks = isDashboard || isProfile;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logoutUser();
    window.location.href = "/";
  };

  const onLogoutClick = () => {
    if (isDashboard) {
      setShowLogoutModal(true);
    } else {
      handleLogout();
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0f1019]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex shrink-0">
              {isDashboard ? (
                <div className="flex items-center gap-2 cursor-default">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-brand-600 rounded-xl flex items-center justify-center">
                    <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white">
                    Binge<span className="text-brand-400">Buddy</span>
                  </span>
                </div>
              ) : (
                <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-brand-600 rounded-xl flex items-center justify-center group-hover:bg-brand-500 transition-colors">
                    <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white">
                    Binge<span className="text-brand-400">Buddy</span>
                  </span>
                </Link>
              )}
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-3">
              {!hideNavLinks && (
                <>
                  <Link to="/about" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2">
                    About Us
                  </Link>
                  <Link to="/contact" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2">
                    Contact
                  </Link>
                </>
              )}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 ${
                      isProfile ? "text-brand-400" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-600/30 overflow-hidden flex items-center justify-center text-[10px]">
                      {user?.avatar || user?.avatar_url ? (
                        <img src={user.avatar || user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    {user.username}
                  </Link>
                  <button onClick={onLogoutClick} className="btn-secondary text-sm flex items-center gap-2 py-1.5">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary text-sm px-4 py-1.5">Log In</Link>
                  <Link to="/signup" className="btn-primary text-sm px-4 py-1.5">Sign Up</Link>
                </>
              )}

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brand-400" />}
              </button>
            </div>

            {/* Mobile Toggle & Theme */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brand-400" />}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f1019] animate-fade-in">
            <div className="px-4 py-6 space-y-4">
              {!hideNavLinks && (
                <>
                  <Link to="/about" className="block text-base font-medium text-gray-600 dark:text-gray-300">About Us</Link>
                  <Link to="/contact" className="block text-base font-medium text-gray-600 dark:text-gray-300">Contact</Link>
                </>
              )}
              {user ? (
                <>
                  <Link to="/profile" className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-white/5 pt-4">
                    <div className="w-8 h-8 rounded-full bg-brand-600/30 overflow-hidden flex items-center justify-center shadow-sm border border-brand-500/20">
                      {user?.avatar || user?.avatar_url ? (
                        <img src={user.avatar || user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.username}</span>
                      <span className="text-xs text-gray-500">View Profile</span>
                    </div>
                  </Link>
                  <button onClick={onLogoutClick} className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                  <Link to="/login" className="btn-secondary text-center py-2.5">Log In</Link>
                  <Link to="/signup" className="btn-primary text-center py-2.5">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-white dark:bg-[#1a1b2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-sm animate-slide-up">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-1">Log Out?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Are you sure you want to log out of BingeBuddy?</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={handleLogout} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

