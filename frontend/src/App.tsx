import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.ts";
import { useNotificationActionHandler } from "./hooks/useNotificationActionHandler.ts";
import Layout from "./components/Layout.tsx";
import Home from "./screens/Home.tsx";
import Hydration from "./screens/Hydration.tsx";
import Activity from "./screens/Activity.tsx";
import Nutrition from "./screens/Nutrition.tsx";
import Progress from "./screens/Progress.tsx";
import Settings from "./screens/Settings.tsx";

function AuthGate() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session) {
    return <AuthenticatedApp />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signIn(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send magic link",
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-0">
      <div className="w-full max-w-sm space-y-8 animate-fade-up">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center shrink-0">
              <span className="text-surface-0 text-[11px] font-bold tracking-tighter leading-none">
                HMM
              </span>
            </span>
            <h1 className="text-lg font-semibold text-ink-primary tracking-wide">
              Human Maintenance Manual
            </h1>
          </div>
          <p className="text-sm text-ink-tertiary pl-[42px]">
            Sign in with a magic link
          </p>
        </div>

        {sent ? (
          <div className="bg-brand-500/[.08] border border-brand-500/20 rounded-xl p-5 text-center animate-fade-in">
            <p className="text-sm font-medium text-brand-500">
              Check your email
            </p>
            <p className="text-xs text-ink-secondary mt-1">
              A sign-in link has been sent to {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-2 border border-white/[.09] rounded-xl px-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/60 transition-colors"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-brand-500 text-surface-0 text-sm font-semibold hover:bg-brand-600 active:scale-[.97] transition-all"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  useNotificationActionHandler();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/hydration" element={<Hydration />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AuthGate />;
}
