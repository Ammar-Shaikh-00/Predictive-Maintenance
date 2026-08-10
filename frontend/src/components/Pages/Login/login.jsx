import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/authContext";
import DemoCredentials from "./demoCredentials";

export default function Login({ backendStatus }) {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();

    const validateEmail = (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    };

    const validatePassword = (value) => {
        return value.length >= 3;
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (value && !validateEmail(value)) {
            setEmailError(t("login.invalidEmail"));
        } else {
            setEmailError("");
        }
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (value && !validatePassword(value)) {
            setPasswordError(t("login.passwordMinLength"));
        } else {
            setPasswordError("");
        }
    };

    const resolveLoginError = (err) => {
        if (err.message) {
            if (
                err.message.includes("timeout") ||
                err.message.includes("Failed to fetch")
            ) {
                return t("login.backendNotResponding");
            }
            if (err.message.includes("401") || err.message.includes("Invalid")) {
                return t("login.invalidCredentials");
            }
            return err.message;
        }
        if (err.response?.data?.detail) {
            return err.response.data.detail;
        }
        return t("login.loginFailed");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setEmailError("");
        setPasswordError("");

        if (!email) {
            setEmailError(t("login.emailRequired"));
            return;
        }
        if (!validateEmail(email)) {
            setEmailError(t("login.invalidEmail"));
            return;
        }
        if (!password) {
            setPasswordError(t("login.passwordRequired"));
            return;
        }
        if (!validatePassword(password)) {
            setPasswordError(t("login.passwordMinLength"));
            return;
        }

        setIsLoading(true);

        try {
            await login(email, password);
            navigate("/");
        } catch (err) {
            setError(resolveLoginError(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="zitta-login-shell min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90 mb-2">
                        ZITTA
                    </p>
                    <h1 className="text-3xl font-bold text-slate-50 mb-2">
                        {t("login.appTitle")}
                    </h1>
                    <p className="text-slate-400 text-sm">{t("login.tagline")}</p>
                </div>

                <div className="bg-[#141820] border border-white/10 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-2xl font-semibold text-slate-100 mb-6 text-center">
                        {t("login.signIn")}
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/40 rounded-lg text-rose-300 text-sm">
                            <div className="flex items-center gap-2">
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t("login.email")}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                className="w-full px-4 py-3 border border-white/10 bg-[#0f1218] rounded-xl text-slate-100"
                                placeholder={t("login.emailPlaceholder")}
                                disabled={isLoading}
                            />
                            {emailError && (
                                <p className="text-xs text-rose-400 mt-1">{emailError}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t("login.password")}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-3 border border-white/10 bg-[#0f1218] rounded-xl text-slate-100"
                                disabled={isLoading}
                            />
                            {passwordError && (
                                <p className="text-xs text-rose-400 mt-1">{passwordError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || emailError || passwordError}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition disabled:opacity-50"
                        >
                            {isLoading ? t("login.signingIn") : t("login.signIn")}
                        </button>
                    </form>

                    <DemoCredentials />

                    <div
                        className={`mt-6 pt-6 border-t border-white/10 space-y-3 text-xs text-center ${
                            backendStatus === "offline"
                                ? "text-rose-400"
                                : "text-emerald-400"
                        }`}
                    >
                        {t("login.backendStatus")}:{" "}
                        {t(`login.status.${backendStatus || "unknown"}`, {
                          defaultValue: backendStatus || t("login.status.unknown"),
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
