import React, { useState } from 'react';
import { X, ShieldAlert, Lock, Mail, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { adminLogin, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await adminLogin(email, password);
      if (res.success) {
        onClose();
        onSuccess();
      } else {
        setErrorMessage(res.error || 'Invalid administrative credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);

    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setErrorMessage(res.error || 'Google Authentication failed.');
        return;
      }

      if (!res.isAdmin) {
        setErrorMessage(
          'Access Denied: The authenticated Firebase account does not possess the "admin" custom claim. Contact the administrator to assign this role.'
        );
        return;
      }

      onClose();
      onSuccess();
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-md bg-stone-900 text-stone-100 rounded-xl shadow-2xl overflow-hidden border border-stone-800 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-900/60 text-rose-300 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400">
                Restricted Access
              </span>
              <h2 className="text-base font-serif font-bold text-white">
                Store Operations Portal
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/80 border border-rose-800 rounded-lg flex items-center gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Security Notice: Firebase Custom Claims */}
          <div className="p-3 bg-stone-800/80 rounded border border-stone-700/60 text-xs text-stone-300 space-y-1">
            <p className="font-semibold text-stone-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firebase ID Token Claim Guard</span>
            </p>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Client-side role toggling has been removed. Access to the admin console is strictly granted only when the authenticated user's ID token contains the <code className="text-rose-300">"admin"</code> custom claim.
            </p>
          </div>

          {/* Primary Action 1: Sign in with Google (Firebase Auth) */}
          <button
            type="button"
            onClick={handleGoogleAdminSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-full bg-white text-stone-900 hover:bg-stone-100 active:scale-[0.99] font-medium text-xs transition shadow-sm disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-800" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
            )}
            <span>Sign In with Google (Verify Admin Claim)</span>
          </button>

          <div className="flex items-center gap-3 my-2 text-stone-500 text-[10px] uppercase font-mono">
            <div className="flex-1 h-px bg-stone-800" />
            <span>or sign in with admin credentials</span>
            <div className="flex-1 h-px bg-stone-800" />
          </div>

          {/* Primary Action 2: Password Authentication */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Admin Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kkcollection.store"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-700 rounded text-xs text-white focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-stone-300">
                  Admin Master Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-700 rounded text-xs text-white focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-rose-800 text-white hover:bg-rose-700 active:scale-[0.99] font-semibold text-xs tracking-wider uppercase transition shadow-md disabled:opacity-50 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Server Claims...</span>
                </>
              ) : (
                <span>Authenticate Administrator</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
