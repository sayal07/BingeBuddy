import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: attach JWT ───
api.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(sessionStorage.getItem("tokens") || "{}");
    if (tokens.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: auto-refresh on 401 ───
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const tokens = JSON.parse(sessionStorage.getItem("tokens") || "{}");
      if (tokens.refresh) {
        try {
          const res = await axios.post(`${API_BASE}/api/auth/token/refresh/`, {
            refresh: tokens.refresh,
          });
          const newTokens = {
            access: res.data.access,
            refresh: res.data.refresh || tokens.refresh,
          };
          sessionStorage.setItem("tokens", JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        } catch {
          sessionStorage.removeItem("tokens");
          sessionStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── WebSocket URL helper ───
export function getWsUrl(path) {
  const wsBase = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
  return `${wsBase}/${path}`;
}
