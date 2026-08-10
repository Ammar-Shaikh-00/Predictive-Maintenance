import axios from "axios";

// Use env OR fallback
export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://192.168.100.24:8002";

// export const API_BASE_URL =
//   (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
//   "http://100.119.197.81:8002";
// export const API_BASE_URL = "http://100.119.197.81:8000"; // for production


const ACCESS_TOKEN_KEY = "access_token";

// In-memory token
let accessToken = null;

// Init from localStorage
if (typeof window !== "undefined") {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
    accessToken = token;
    if (typeof window !== "undefined") {
        if (token) {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
    }
}

export function getAccessToken() {
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (stored !== accessToken) {
            accessToken = stored;
        }
    }
    return accessToken;
}

const REFRESH_ENDPOINT = "/users/refresh";

/** Single in-flight refresh so 401 storms and proactive refresh do not race. */
let refreshInFlight = null;

export function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token");
      }

      const baseURL =
        (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
        API_BASE_URL;

      const res = await axios.post(`${baseURL}${REFRESH_ENDPOINT}`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token: newRefreshToken } = res.data;

      setAccessToken(access_token);

      if (newRefreshToken) {
        localStorage.setItem("refresh_token", newRefreshToken);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pm-access-token-refreshed", {
            detail: { access_token },
          })
        );
      }

      return access_token;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    headers: {
        "Content-Type": "application/json",
    },
});

// ✅ Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Let the browser set multipart boundary for FormData uploads
        if (typeof FormData !== "undefined" && config.data instanceof FormData) {
            if (config.headers && typeof config.headers.delete === "function") {
                config.headers.delete("Content-Type");
            } else if (config.headers) {
                delete config.headers["Content-Type"];
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ Response interceptor (refresh token)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const reqUrl = originalRequest?.url || "";
        const isRefreshCall = reqUrl.includes(REFRESH_ENDPOINT);

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isRefreshCall
        ) {
            originalRequest._retry = true;

            try {
                const access_token = await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                setAccessToken(null);
                localStorage.removeItem("refresh_token");

                if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                    window.location.href = "/login";
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;