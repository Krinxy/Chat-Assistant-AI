import { type FormEvent, useCallback, useState } from "react";

import { apiRegister } from "../../shared/api/auth_api";
import type { Language } from "../../features/chat/types/chat";

const MAX_ERROR_LENGTH = 200;

interface LoginPanelProps {
  language: Language;
  onLoginSuccess: (email: string, password: string) => Promise<void>;
}

interface Copy {
  headline: string;
  subline: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitLabel: string;
  loadingLabel: string;
  errorFallback: string;
  tabLogin: string;
  tabRegister: string;
  registerHeadline: string;
  registerSubline: string;
  registerSubmit: string;
  registerLoading: string;
  registerErrorFallback: string;
  registerSuccess: string;
  footerHint: string;
}

const copy: Record<Language, Copy> = {
  de: {
    headline: "Willkommen zurück",
    subline: "Melde dich mit deinem Unternehmens-Account an.",
    emailLabel: "Geschäftliche E-Mail",
    emailPlaceholder: "name@unternehmen.de",
    passwordLabel: "Passwort",
    passwordPlaceholder: "••••••••",
    submitLabel: "Anmelden",
    loadingLabel: "Anmelden …",
    errorFallback: "Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.",
    tabLogin: "Anmelden",
    tabRegister: "Registrieren",
    registerHeadline: "Zugang beantragen",
    registerSubline: "Erstelle deinen Unternehmens-Zugang für AURA.",
    registerSubmit: "Zugang erstellen",
    registerLoading: "Zugang wird erstellt …",
    registerErrorFallback: "Registrierung fehlgeschlagen.",
    registerSuccess: "Zugang erstellt — du wirst angemeldet …",
    footerHint: "Bald verfügbar: Anmeldung per ​E-Mail-Link ohne Passwort.",
  },
  en: {
    headline: "Welcome back",
    subline: "Sign in with your business account.",
    emailLabel: "Business email",
    emailPlaceholder: "name@company.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    submitLabel: "Sign in",
    loadingLabel: "Signing in …",
    errorFallback: "Sign-in failed. Please check your credentials.",
    tabLogin: "Sign in",
    tabRegister: "Register",
    registerHeadline: "Request access",
    registerSubline: "Create your business account for AURA.",
    registerSubmit: "Create account",
    registerLoading: "Creating account …",
    registerErrorFallback: "Registration failed.",
    registerSuccess: "Account created — signing you in …",
    footerHint: "Coming soon: passwordless sign-in via ​email link.",
  },
};

type Mode = "login" | "register";

export function LoginPanel({ language, onLoginSuccess }: LoginPanelProps) {
  const t = copy[language];

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setError(null);
      setSuccess(null);
      setIsLoading(true);
      try {
        if (mode === "login") {
          await onLoginSuccess(email.trim(), password);
        } else {
          await apiRegister(email.trim(), password);
          setSuccess(t.registerSuccess);
          await onLoginSuccess(email.trim(), password);
        }
      } catch (err) {
        const raw = err instanceof Error ? err.message : (mode === "login" ? t.errorFallback : t.registerErrorFallback);
        setError(raw.slice(0, MAX_ERROR_LENGTH));
      } finally {
        setIsLoading(false);
      }
    },
    [mode, email, password, onLoginSuccess, t],
  );

  const isSubmitDisabled = isLoading || email.trim().length === 0 || password.length === 0;
  const isLogin = mode === "login";

  return (
    <div className="login-root">
      {/* Aurora rotating layers */}
      <div className="login-aurora" aria-hidden="true">
        <div className="login-aurora-1" />
        <div className="login-aurora-2" />
        <div className="login-aurora-3" />
        <div className="login-aurora-4" />
        <div className="login-aurora-glow" />
      </div>

      <div className="login-orb login-orb--1" aria-hidden="true" />
      <div className="login-orb login-orb--2" aria-hidden="true" />
      <div className="login-orb login-orb--3" aria-hidden="true" />
      <div className="login-orb login-orb--4" aria-hidden="true" />

      {/* Brand */}
      <div className="login-brand">
        <img src="/favicon.png" alt="AURA" className="login-brand-img" />
        <span className="login-brand-name">AURA</span>
      </div>

      {/* Card */}
      <div className="login-card">

        {/* Tabs — underline style */}
        <div className="login-tabs" role="tablist">
          <div className="login-tab-indicator" aria-hidden="true" />
          <button
            role="tab"
            aria-selected={isLogin}
            className={`login-tab${isLogin ? " login-tab--active" : ""}`}
            onClick={() => { switchMode("login"); }}
            type="button"
          >
            {t.tabLogin}
          </button>
          <button
            role="tab"
            aria-selected={!isLogin}
            className={`login-tab${!isLogin ? " login-tab--active" : ""}`}
            onClick={() => { switchMode("register"); }}
            type="button"
          >
            {t.tabRegister}
          </button>
        </div>

        {/* Header */}
        <header className="login-header">
          <h1 className="login-headline">
            {isLogin ? t.headline : t.registerHeadline}
          </h1>
          <div className="login-subline-wrap">
            <div className="login-subline-bar" aria-hidden="true" />
            <p className="login-subline">
              {isLogin ? t.subline : t.registerSubline}
            </p>
          </div>
        </header>

        {/* Form */}
        <form className="login-form" onSubmit={(e) => { void handleSubmit(e); }} noValidate>
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">{t.emailLabel}</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              required
              disabled={isLoading}
              maxLength={254}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">{t.passwordLabel}</label>
            <input
              id="login-password"
              className="login-input"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              required
              disabled={isLoading}
              maxLength={128}
            />
          </div>

          {error !== null && (
            <p className="login-error" role="alert" aria-live="assertive">{error}</p>
          )}
          {success !== null && (
            <p className="login-success" role="status" aria-live="polite">{success}</p>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitDisabled}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                {isLogin ? t.loadingLabel : t.registerLoading}
              </>
            ) : (
              isLogin ? t.submitLabel : t.registerSubmit
            )}
          </button>
        </form>

        {/* Magic-link teaser */}
        <footer className="login-footer">
          <p className="login-footer-text">
            {t.footerHint.split("E-Mail-Link")[0]}
            <strong>{language === "de" ? "E-Mail-Link" : "email link"}</strong>
            {t.footerHint.split(language === "de" ? "E-Mail-Link" : "email link")[1]}
          </p>
        </footer>
      </div>
    </div>
  );
}
