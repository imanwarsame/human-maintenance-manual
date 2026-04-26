import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.ts';
import Layout from './components/Layout.tsx';
import Home from './screens/Home.tsx';
import Hydration from './screens/Hydration.tsx';
import Activity from './screens/Activity.tsx';
import Nutrition from './screens/Nutrition.tsx';

function AuthGate() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/hydration" element={<Hydration />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await signIn(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Human Maintenance Manual</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in with a magic link</p>
        </div>

        {sent ? (
          <div className="bg-brand-50 border border-brand-500/20 rounded-2xl p-5 text-center">
            <p className="text-sm font-medium text-brand-700">Check your email</p>
            <p className="text-xs text-gray-500 mt-1">A sign-in link has been sent to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <AuthGate />;
}
