import React, { useState, useEffect } from 'react';
import { signUp, signIn, signInWithGoogle, signInWithDiscord, getCurrentUser, onAuthStateChange } from '../services/auth';
import { getUserDisplayName } from '../services/user';

interface LoginModalProps {
  isVisible: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isVisible, onClose, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in
    getCurrentUser().then(({ user }) => {
      if (user) {
        setUser(user);
        onLogin(user);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user);
      if (user) {
        onLogin(user);
      }
    });

    return () => subscription.unsubscribe();
  }, [onLogin]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = mode === 'login' 
        ? await signIn(email, password)
        : await signUp(email, password, username);

      if (result.error) {
        setError(result.error.message);
      } else if (result.user) {
        onLogin(result.user);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'discord') => {
    setLoading(true);
    setError(null);

    try {
      const result = provider === 'google' 
        ? await signInWithGoogle()
        : await signInWithDiscord();

      if (result.error) {
        setError(result.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-ink-800/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cream-50 rounded-3xl border-2 border-cream-300 shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-display font-bold text-ink-700">Join Synthia</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-cream-100 border-2 border-cream-300 text-ink-500 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700 transition-colors flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        {user ? (
          // User is logged in
          <div className="text-center space-y-4">
            <div className="text-emerald-600 text-lg font-display font-semibold">Welcome back</div>
            <div className="text-ink-700 font-semibold">
              {user.user_metadata?.display_name || user.user_metadata?.username || user.email}
            </div>
            <div className="text-ink-500 text-sm">
              Your discoveries will be saved and tracked for rarity calculations.
            </div>
            <button
              onClick={onClose}
              className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-display font-semibold py-3 px-4 rounded-full transition-all duration-200"
            >
              Start Playing
            </button>
          </div>
        ) : (
          // Login/Signup form
          <>
            {/* Mode Toggle */}
            <div className="flex bg-cream-100 border border-cream-300 rounded-full p-1 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 px-4 rounded-full font-display font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-amber-400 text-ink-800'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 px-4 rounded-full font-display font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-amber-400 text-ink-800'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-cream-100 border-2 border-cream-300 rounded-xl px-3 py-2 text-ink-700 placeholder:text-ink-400 focus:outline-none focus:border-amber-400"
                    placeholder="Choose a username"
                    required={mode === 'signup'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink-600 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-cream-100 border-2 border-cream-300 rounded-xl px-3 py-2 text-ink-700 placeholder:text-ink-400 focus:outline-none focus:border-amber-400"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-600 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-cream-100 border-2 border-cream-300 rounded-xl px-3 py-2 text-ink-700 placeholder:text-ink-400 focus:outline-none focus:border-amber-400"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-rose-600 text-sm bg-rose-50 border border-rose-300 rounded-xl p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-400 hover:bg-emerald-500 disabled:bg-cream-200 disabled:text-ink-400 text-white font-display font-semibold py-3 px-4 rounded-full transition-all duration-200 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center mb-6">
              <div className="flex-1 border-t border-cream-300"></div>
              <span className="px-4 text-ink-400 text-sm">or</span>
              <div className="flex-1 border-t border-cream-300"></div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="w-full bg-cream-50 hover:bg-cream-100 disabled:bg-cream-100 border-2 border-cream-300 text-ink-700 font-display font-semibold py-3 px-4 rounded-full transition-all duration-200"
              >
                Continue with Google
              </button>

              <button
                onClick={() => handleOAuth('discord')}
                disabled={loading}
                className="w-full bg-violet-100 hover:bg-violet-200 disabled:bg-cream-100 border-2 border-violet-300 text-violet-700 font-display font-semibold py-3 px-4 rounded-full transition-all duration-200"
              >
                Continue with Discord
              </button>
            </div>

            {/* Anonymous Play */}
            <div className="mt-6 pt-4 border-t border-cream-300">
              <button
                onClick={onClose}
                className="w-full text-ink-500 hover:text-ink-700 transition-colors text-sm"
              >
                Continue as Anonymous Player
              </button>
              <div className="text-xs text-ink-400 text-center mt-2">
                Your progress won't be saved across devices
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
