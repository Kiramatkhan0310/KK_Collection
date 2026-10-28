import React, { useState } from 'react';
import { Mail, Sparkles, CheckCircle2, Loader2, ArrowRight, ShieldCheck, Gift } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase.ts';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email validation regex
  const validateEmail = (val: string): boolean => {
    return /^[^@]+@[^@]+\.[^@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setErrorMessage('Please enter your email address to claim your bespoke invitation.');
      return;
    }

    if (!validateEmail(trimmed)) {
      setErrorMessage('Please provide a valid email format (e.g., client@domain.com).');
      return;
    }

    setLoading(true);

    const path = 'newsletter_subscriptions';
    try {
      // Create document reference with auto-generated unique ID conforming to isValidId
      const newDocRef = doc(collection(db, path));

      await setDoc(newDocRef, {
        email: trimmed,
        createdAt: serverTimestamp(),
        source: 'storefront_footer',
        status: 'active'
      });

      setIsSuccess(true);
      setEmail('');
    } catch (err: unknown) {
      try {
        handleFirestoreError(err, OperationType.WRITE, path);
      } catch (loggingErr) {
        console.error('Handled Firestore subscription error:', loggingErr);
      }
      setErrorMessage('We encountered an unexpected connection issue. Please verify your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 text-stone-100 py-20 px-4 sm:px-6 lg:px-8 border-t border-stone-800 mt-20 sm:mt-24">
      {/* Subtle luxury ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl"
      />

      <div className="relative max-w-4xl mx-auto text-center space-y-6">

        {/* Curated Pre-header Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-800/80 border border-stone-700/80 text-[11px] font-medium tracking-widest uppercase text-rose-300">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>The Atelier Circle · Private Membership</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
            Reserve Your Seat in the Inner Circle
          </h2>
          <p className="text-sm sm:text-base text-stone-400 max-w-2xl mx-auto leading-relaxed">
            Receive private allocations of limited batch skincare distillations, VIP invitations to seasonal haute couture collections, and a welcome privilege.
          </p>
        </div>

        {/* Success Confirmation Card or Form */}
        {isSuccess ? (
          <div className="max-w-xl mx-auto bg-stone-900/90 border border-rose-900/40 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto border border-rose-500/30">
              <CheckCircle2 className="w-6 h-6 text-rose-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-white">
                Welcome to the KK Atelier Circle
              </h3>
              <p className="text-xs sm:text-sm text-stone-300">
                Your email has been recorded for private releases and marketing communications.
              </p>
            </div>

            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-rose-300 shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Your Private Welcome Privilege</div>
                  <div className="text-sm font-mono font-bold text-rose-300">Use code: ATELIER15 (15% Off)</div>
                </div>
              </div>
              <span className="text-[11px] text-stone-500 bg-stone-900 px-2.5 py-1 rounded-md border border-stone-800">
                Valid on first atelier order
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="text-xs text-stone-400 hover:text-stone-200 underline underline-offset-4 transition-colors"
            >
              Register another email address
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="max-w-xl mx-auto space-y-3"
            noValidate
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 bg-stone-900/80 p-1.5 rounded-2xl sm:rounded-full border border-stone-700/80 shadow-2xl backdrop-blur-md focus-within:border-rose-400/80 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
              <div className="flex items-center pl-4 pr-2 py-2 sm:py-0 flex-1">
                <Mail className="w-4 h-4 text-stone-400 shrink-0 mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your personal email address..."
                  disabled={loading}
                  aria-label="Email address for newsletter"
                  className="w-full bg-transparent text-sm text-white placeholder-stone-500 focus:outline-none disabled:opacity-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl sm:rounded-full bg-stone-100 hover:bg-white text-stone-950 font-serif text-xs font-bold tracking-wider uppercase shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-stone-900" />
                    <span>Inscribing...</span>
                  </>
                ) : (
                  <>
                    <span>Claim Invitation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium animate-in fade-in">
                {errorMessage}
              </p>
            )}

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>We value your digital privacy. Instant single-click unsubscribe at any time.</span>
            </div>
          </form>
        )}

        {/* Triple Privilege Badges */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto border-t border-stone-800/80 text-left">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-900/40 border border-stone-800/50">
            <span className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-300 flex items-center justify-center shrink-0 font-serif font-bold text-xs">
              01
            </span>
            <div>
              <h4 className="text-xs font-semibold text-stone-200">15% Welcome Privilege</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">Complimentary atelier reduction on your initial order.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-900/40 border border-stone-800/50">
            <span className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-300 flex items-center justify-center shrink-0 font-serif font-bold text-xs">
              02
            </span>
            <div>
              <h4 className="text-xs font-semibold text-stone-200">First Access Batch Drops</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">48-hour advance reservation before public drops.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-900/40 border border-stone-800/50">
            <span className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-300 flex items-center justify-center shrink-0 font-serif font-bold text-xs">
              03
            </span>
            <div>
              <h4 className="text-xs font-semibold text-stone-200">Skin Concierge Consults</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">Direct botanical formula advisory with our lab chemists.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
