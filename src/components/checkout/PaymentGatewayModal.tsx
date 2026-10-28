import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, CreditCard, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { Order } from '../../types/index.ts';
import { ApiClient } from '../../services/apiClient.ts';
import { formatCurrency } from '../../utils/currency.ts';

interface PaymentGatewayModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSettled: (updatedOrder: Order) => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSettled
}) => {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    let mounted = true;
    async function initSession() {
      if (!isOpen || !order) {
        setLoadingSession(false);
        return;
      }
      setLoadingSession(true);
      setErrorMessage(null);
      setCardHolder(order.shippingAddress.fullName || '');
      try {
        const sess = await ApiClient.createPaymentSession(order.id);
        if (mounted) setSession(sess);
      } catch (err: any) {
        if (mounted) setErrorMessage(err.message || 'Failed to initialize payment gateway.');
      } finally {
        if (mounted) setLoadingSession(false);
      }
    }
    initSession();
    return () => { mounted = false; };
  }, [isOpen, order]);

  const handleAuthorizePayment = async (tamperSignature = false) => {
    if (!session) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const signatureToSubmit = tamperSignature
        ? 'tampered_invalid_signature_attempt_00000'
        : session.signature;

      const result = await ApiClient.verifyPayment({
        orderId: session.orderId,
        amount: session.amount,
        currency: session.currency,
        transactionReference: session.transactionReference,
        timestamp: session.timestamp,
        signature: signatureToSubmit,
        payerCard: {
          brand: 'Visa',
          last4: '4242'
        }
      });

      if (result.verified && result.order) {
        onPaymentSettled(result.order);
      } else {
        setErrorMessage(result.message || 'Payment verification failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gateway verification rejected.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gateway Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">Safepay Pakistan Gateway</h3>
                <span className="text-[10px] bg-emerald-900 text-emerald-200 font-semibold px-2 py-0.5 rounded">
                  256-bit SSL
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-mono">
                Order #{order.orderNumber} · Authoritative Merchant Session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Security Notice */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
              Total Payable Amount
            </span>
            <div className="text-xl font-bold font-mono text-stone-950 tabular-nums">
              {formatCurrency(order.totalAmount, order.currency)}
            </div>
          </div>
          <div className="text-right text-[11px] text-stone-500">
            <span>Merchant: <strong>KK Collection Lahore</strong></span>
            <span className="block font-mono text-[10px] text-stone-400">NTN: 8941022-7</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {loadingSession ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
              <p className="text-xs text-stone-600 font-medium">Negotiating cryptographic session with payment gateway...</p>
            </div>
          ) : session ? (
            <>
              {/* Technical Cryptographic Signature Banner */}
              <div className="p-3 bg-stone-100 rounded border border-stone-200 space-y-1 font-mono text-[10px] text-stone-700">
                <div className="flex justify-between">
                  <span className="text-stone-500">Transaction Ref:</span>
                  <strong className="text-stone-900">{session.transactionReference}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">HMAC-SHA256 Signature:</span>
                  <span className="text-stone-600 truncate max-w-[200px]">{session.signature}</span>
                </div>
              </div>

              {/* Virtual Payment Card */}
              <div className="p-4 rounded-xl bg-gradient-to-tr from-stone-900 to-stone-800 text-white space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <CreditCard className="w-6 h-6 text-rose-300" />
                  <span className="text-xs font-mono font-bold tracking-widest uppercase">TEST SANDBOX</span>
                </div>
                <div className="text-sm font-mono tracking-widest pt-2">
                  {cardNumber}
                </div>
                <div className="flex justify-between items-end text-[10px] font-mono text-stone-300 pt-1">
                  <div>
                    <span className="text-stone-400 block text-[9px]">CARDHOLDER</span>
                    <span>{cardHolder}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[9px]">EXPIRES</span>
                    <span>{cardExpiry}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Card Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Card Number (Pre-filled 3D Secure Test Card)</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full font-mono bg-stone-50 border border-stone-300 rounded px-3 py-2 text-stone-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full font-mono bg-stone-50 border border-stone-300 rounded px-3 py-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">CVV Security Code</label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full font-mono bg-stone-50 border border-stone-300 rounded px-3 py-2 text-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAuthorizePayment(false)}
                  className="w-full py-3.5 px-4 rounded-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wider uppercase transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Cryptographic Handshake...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorize Payment ({formatCurrency(order.totalAmount, order.currency)})</span>
                    </>
                  )}
                </button>

                {/* Developer Safety Test: Tampered Signature test */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAuthorizePayment(true)}
                  className="w-full py-2 px-3 text-[11px] text-stone-500 hover:text-stone-800 underline text-center"
                >
                  Test Failure Handling (Simulate Tampered Signature Mismatch)
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
