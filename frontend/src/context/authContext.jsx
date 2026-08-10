import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import api, {
    API_BASE_URL,
    setAccessToken as setApiAccessToken,
    refreshAccessToken,
    getAccessToken,
} from "../api";
import { parseJwtExpiryMs } from "../utils/jwt";

const AuthContext = createContext(undefined);

const REFRESH_TOKEN_KEY = "refresh_token";
/** Refresh access token this long before JWT `exp` (when payload exposes `exp`). */
const REFRESH_BUFFER_MS = 60_000;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const proactiveTimerRef = useRef(null);

    const clearProactiveTimer = () => {
        if (proactiveTimerRef.current !== null) {
            clearTimeout(proactiveTimerRef.current);
            proactiveTimerRef.current = null;
        }
    };

    const scheduleProactiveTokenRefresh = useCallback(() => {
        clearProactiveTimer();
        const access = getAccessToken();
        if (!access) return;
        const expMs = parseJwtExpiryMs(access);
        if (!expMs) return;

        const rawDelay = expMs - Date.now() - REFRESH_BUFFER_MS;
        const delay = rawDelay <= 0 ? 0 : rawDelay;

        proactiveTimerRef.current = setTimeout(async () => {
            proactiveTimerRef.current = null;
            if (!localStorage.getItem(REFRESH_TOKEN_KEY)) return;
            try {
                await refreshAccessToken();
            } catch {
                /* refreshAccessToken / interceptor may redirect to login */
            }
        }, delay);
    }, []);

    useEffect(() => {
        const onAccessTokenRefreshed = (event) => {
            const next = event.detail?.access_token;
            if (next) setToken(next);
        };
        window.addEventListener("pm-access-token-refreshed", onAccessTokenRefreshed);
        return () =>
            window.removeEventListener("pm-access-token-refreshed", onAccessTokenRefreshed);
    }, []);

    useEffect(() => {
        if (!token) {
            clearProactiveTimer();
            return undefined;
        }
        scheduleProactiveTokenRefresh();
        return clearProactiveTimer;
    }, [token, scheduleProactiveTokenRefresh]);

    useEffect(() => {
        const initAuth = async () => {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (refreshToken) {
                try {
                    const refreshed = await refreshTokenSilently();
                    if (refreshed) {
                        setIsLoading(false);
                        return;
                    }
                } catch (error) {
                    console.error("Token refresh failed:", error);
                    localStorage.removeItem(REFRESH_TOKEN_KEY);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const refreshTokenSilently = async () => {
        try {
            await refreshAccessToken();
            const access_token = getAccessToken();
            if (!access_token) return false;
            setToken(access_token);
            await fetchUserProfile(access_token);
            return true;
        } catch (error) {
            console.error("Token refresh failed:", error);
            return false;
        }
    };

    const fetchUserProfile = async (tokenValue) => {
        try {
            const response = await api.get("/users/me", {
                headers: { Authorization: `Bearer ${tokenValue}` },
                timeout: 5000,
            });
            setUser(response.data);
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
        }
    };

    const login = async (email, password) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const params = new URLSearchParams();
            params.append("username", email);
            params.append("password", password);

            const apiUrl = import.meta.env.VITE_API_URL || API_BASE_URL;

            const response = await fetch(`${apiUrl}/users/login`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorData;
                try {
                    const errorText = await response.text();
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { detail: errorText || `Server error (${response.status})` };
                    }
                } catch {
                    errorData = { detail: `Server error (${response.status})` };
                }
                throw new Error(errorData.detail || "Login failed");
            }

            const data = await response.json();
            const { access_token, refresh_token } = data;

            setToken(access_token);
            setApiAccessToken(access_token);

            if (refresh_token) {
                localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
            }

            setUser({
                id: "temp",
                email: email,
                role: "admin",
            });

            setTimeout(() => {
                fetchUserProfile(access_token).catch(() => {});
            }, 100);
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === "AbortError") {
                throw new Error("Login timeout. Please check your connection.");
            }
            throw err;
        }
    };

    const logout = async () => {
        clearProactiveTimer();
        setToken(null);
        setUser(null);

        const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setApiAccessToken(null);

        window.location.href = "/login";

        if (storedRefresh) {
            api.post("/users/logout", { refresh_token: storedRefresh }).catch(() => {});
        }
    };

    const refreshToken = async () => {
        if (!localStorage.getItem(REFRESH_TOKEN_KEY)) return false;
        return await refreshTokenSilently();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                refreshToken,
                isAuthenticated: !!token,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
