import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, MapPin, AlertCircle, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const { customerLogin, customerRegister, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Karachi');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await customerLogin(email, password);
        if (res.success) {
          onClose();
          onSuccess?.();
        } else {
          setErrorMessage(res.error || 'Login credentials incorrect.');
        }
      } else {
        const res = await customerRegister({
          email,
          password,
          fullName,
          phone,
          addressLine1,
          city
        });
        if (res.success) {
          onClose();
          onSuccess?.();
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-stone-50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-800">
              KK Client Atelier
            </span>
            <h2 className="text-xl font-serif font-bold text-stone-900">
              {mode === 'login' ? 'Sign In to Your Account' : 'Create Client Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name <span className="text-rose-700">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Phone (Pakistan)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03001234567"
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    <option value="Karachi">Karachi</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Islamabad">Islamabad</option>
                    <option value="Rawalpindi">Rawalpindi</option>
                    <option value="Faisalabad">Faisalabad</option>
                    <option value="Multan">Multan</option>
                    <option value="Peshawar">Peshawar</option>
                    <option value="Quetta">Quetta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Delivery Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="House, street, phase, or sector"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email Address <span className="text-rose-700">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@kkcollection.store"
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-stone-700">
                Password <span className="text-rose-700">*</span>
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[10px] text-stone-400 mt-1">Minimum 8 characters with salt PBKDF2 encryption.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-stone-900 text-stone-100 hover:bg-stone-800 active:scale-[0.99] font-semibold text-xs tracking-wider uppercase transition shadow-md disabled:opacity-50 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : mode === 'login' ? (
              <span>Sign In to Atelier</span>
            ) : (
              <span>Register Account</span>
            )}
          </button>

          {/* Continue with Google (Firebase Authentication) */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-white px-2 text-stone-400">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setErrorMessage(null);
              setLoading(true);
              try {
                const res = await signInWithGoogle();
                if (res.success) {
                  onClose();
                  onSuccess?.();
                } else {
                  setErrorMessage(res.error || 'Google Sign-In failed.');
                }
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-full border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 font-medium text-xs transition shadow-xs disabled:opacity-50"
          >
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
            <span>Continue with Google</span>
          </button>

          {/* Toggle Login / Register */}
          <div className="pt-3 border-t border-stone-200 text-center text-xs text-stone-600">
            {mode === 'login' ? (
              <p>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                  className="font-bold text-stone-900 underline hover:text-rose-900 ml-1"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="font-bold text-stone-900 underline hover:text-rose-900 ml-1"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
