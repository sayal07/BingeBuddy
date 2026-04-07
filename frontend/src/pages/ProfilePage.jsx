import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { User, Save, Lock, Sun, Moon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({
    username: user?.username || "",
    bio: user?.bio || "",
    avatar_url: user?.avatar_url || "",
  });
  const [passwords, setPasswords] = useState({ old_password: "", new_password: "" });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/auth/profile/", form);
      updateUser(res.data);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.username?.[0] || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true);
    try {
      await api.put("/auth/change-password/", passwords);
      toast.success("Password changed!");
      setPasswords({ old_password: "", new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.old_password?.[0] || "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="font-display text-3xl font-bold animate-fade-in text-gray-900 dark:text-white">Profile Settings</h1>

        {/* Profile Info */}
        <form onSubmit={handleSaveProfile} className="card space-y-5 animate-slide-up">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/30 overflow-hidden flex items-center justify-center text-2xl font-bold text-gray-900 dark:text-white">
              {user?.avatar || user?.avatar_url ? (
                <img src={user.avatar || user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <p className="font-display font-semibold text-lg text-gray-900 dark:text-white">{user?.username}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
            <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})}
                   className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})}
                      rows={3} maxLength={300} className="input-field resize-none"
                      placeholder="Tell us about yourself..." />
            <p className="text-xs text-gray-500 mt-1">{form.bio.length}/300</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Avatar URL</label>
            <input type="url" value={form.avatar_url} onChange={(e) => setForm({...form, avatar_url: e.target.value})}
                   className="input-field" placeholder="https://..." />
          </div>

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {/* Theme */}
        <div className="card animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="font-display font-semibold text-lg mb-4 text-gray-900 dark:text-white">Appearance</h2>
          <button onClick={toggleTheme}
                  className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-3 w-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            {theme === "dark" ? <Moon className="w-5 h-5 text-brand-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Click to switch to {theme === "dark" ? "light" : "dark"} mode</p>
            </div>
          </button>
        </div>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="card space-y-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
            <Lock className="w-5 h-5 text-brand-400" /> Change Password
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
            <input type="password" value={passwords.old_password}
                   onChange={(e) => setPasswords({...passwords, old_password: e.target.value})}
                   className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
            <input type="password" value={passwords.new_password}
                   onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
                   className="input-field" required />
          </div>
          <button type="submit" disabled={changingPw} className="btn-secondary flex items-center gap-2">
            {changingPw ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            {changingPw ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
