import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Truck, Check, AlertCircle, Loader2, CreditCard, Banknote } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCurrency } from '../utils/currency.ts';
import { ApiClient } from '../services/apiClient.ts';
import { Order, PaymentMethod } from '../types/index.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: Order, needsPayment: boolean) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderCompleted
}) => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: user?.defaultAddress?.fullName || user?.displayName || '',
    phone: user?.defaultAddress?.phone || user?.phoneNumber || '',
    email: user?.email || '',
    addressLine1: user?.defaultAddress?.addressLine1 || '',
    city: user?.defaultAddress?.city || 'Karachi',
    stateOrProvince: user?.defaultAddress?.stateOrProvince || 'Sindh',
    postalCode: user?.defaultAddress?.postalCode || '75500',
    country: 'Pakistan',
    paymentMethod: 'cash_on_delivery' as PaymentMethod,
    promoCode: ''
  });

  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Dynamic courier rate from server
  const [shippingRate, setShippingRate] = useState({
    shippingFee: 0,
    carrier: 'TCS Express Pakistan',
    estimatedDeliveryDays: '2–3 days',
    isComplimentary: true
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    setFormData((current) => ({
      ...current,
      fullName: user.defaultAddress?.fullName || user.displayName || current.fullName,
      phone: user.defaultAddress?.phone || user.phoneNumber || current.phone,
      email: user.email || current.email,
      addressLine1: user.defaultAddress?.addressLine1 || current.addressLine1,
      city: user.defaultAddress?.city || current.city,
      stateOrProvince: user.defaultAddress?.stateOrProvince || current.stateOrProvince,
      postalCode: user.defaultAddress?.postalCode || current.postalCode
    }));
  }, [isOpen, user]);

  useEffect(() => {
    let mounted = true;
    async function updateRates() {
      if (!isOpen) return;
      try {
        const res = await ApiClient.calculateCourierRate(formData.city, 0.6, subtotal);
        if (mounted) setShippingRate(res);
      } catch (e) {
        console.error('Failed to calculate shipping', e);
      }
    }
    updateRates();
    return () => { mounted = false; };
  }, [formData.city, subtotal, isOpen]);

  const discount = appliedPromo ? appliedPromo.discountAmount : 0;
  const deliveryFee = shippingRate.shippingFee;
  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    setPromoError(null);
    if (!code) return;

    setIsCheckingPromo(true);
    try {
      const res = await ApiClient.validatePromoCode(code, subtotal);
      if (res.valid) {
        setAppliedPromo({
          code: res.code || code,
          discountAmount: res.discountAmount || 0,
          message: res.message
        });
        setPromoInput('');
      } else {
        setPromoError(res.message);
      }
    } catch (err: any) {
      setPromoError(err.message || 'Invalid voucher code.');
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (items.length === 0) {
      setSubmissionError('Your shopping bag is empty.');
      return;
    }

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.addressLine1.trim()) {
      setSubmissionError('Please complete all mandatory delivery fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Transactional Server Order Placement with atomic stock decrement
      const result = await ApiClient.createOrder({
        items,
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          addressLine1: formData.addressLine1,
          city: formData.city,
          stateOrProvince: formData.stateOrProvince,
          postalCode: formData.postalCode,
          country: formData.country
        },
        promoCode: appliedPromo?.code,
        paymentMethod: formData.paymentMethod,
        email: formData.email
      });

      if (result.order) {
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // non-blocking
        }

        clearCart();
        onClose();

        const needsOnlinePayment = formData.paymentMethod === 'online_gateway';
        onOrderCompleted(result.order, needsOnlinePayment);
      }
    } catch (err: any) {
      setSubmissionError(err.message || 'Server rejected order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-800">
              Transaction Checkout
            </span>
            <h2 className="text-xl font-serif font-bold text-stone-900">
              Delivery Coordinates &amp; Authoritative Payment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submissionError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{submissionError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">

          {/* Left Form: Delivery Address & Settlement Method */}
          <div className="lg:col-span-7 p-6 space-y-6">

            {/* 1. Recipient Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <Truck className="w-4 h-4 text-stone-700" />
                <h3 className="text-xs uppercase font-semibold tracking-wider text-stone-900">
                  1. Recipient &amp; Delivery Destination (Pakistan)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Full Name <span className="text-rose-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Your full name"
                    className="w-full bg-stone-50 border border-stone-300 rounded-md px-3 py-2 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mobile Phone <span className="text-rose-700">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="03001234567"
                    className="w-full bg-stone-50 border border-stone-300 rounded-md px-3 py-2 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@kkcollection.store"
                    className="w-full bg-stone-50 border border-stone-300 rounded-md px-3 py-2 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Street Address / House / Flat <span className="text-rose-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder="Street, house, area"
                    className="w-full bg-stone-50 border border-stone-300 rounded-md px-3 py-2 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    City (Pakistan) <span className="text-rose-700">*</span>
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => {
                      const city = e.target.value;
                      let province = 'Punjab';
                      if (['Karachi', 'Hyderabad', 'Sukkur'].includes(city)) province = 'Sindh';
                      else if (['Islamabad'].includes(city)) province = 'Federal';
                      else if (['Peshawar', 'Mardan', 'Abbottabad'].includes(city)) province = 'Khyber Pakhtunkhwa';
                      else if (['Quetta'].includes(city)) province = 'Balochistan';
                      setFormData({ ...formData, city, stateOrProvince: province });
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-md px-3 py-2 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  >
                    <option value="Karachi">Karachi</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Islamabad">Islamabad</option>
                    <option value="Rawalpindi">Rawalpindi</option>
                    <option value="Faisalabad">Faisalabad</option>
                    <option value="Multan">Multan</option>
                    <option value="Peshawar">Peshawar</option>
                    <option value="Quetta">Quetta</option>
                    <option value="Sialkot">Sialkot</option>
                    <option value="Gujranwala">Gujranwala</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="75500"
                    className="w-full bg-stone-50 border border-stone-300 rounded-md px-3 py-2 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Settlement Method */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <ShieldCheck className="w-4 h-4 text-stone-700" />
                <h3 className="text-xs uppercase font-semibold tracking-wider text-stone-900">
                  2. Settlement &amp; Verification Method
                </h3>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery option */}
                <label className={`flex items-start gap-3.5 p-3.5 rounded-lg border cursor-pointer transition ${
                  formData.paymentMethod === 'cash_on_delivery'
                    ? 'border-stone-900 bg-stone-50/80 shadow-xs ring-1 ring-stone-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={formData.paymentMethod === 'cash_on_delivery'}
                    onChange={() => setFormData({ ...formData, paymentMethod: 'cash_on_delivery' })}
                    className="mt-0.5 text-stone-900"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-stone-900">Cash on Delivery (COD)</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 font-semibold px-2 py-0.5 rounded">
                        TCS Courier Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Pay physically upon parcel delivery after inspection. No upfront card required.
                    </p>
                  </div>
                </label>

                {/* Instant Card / Digital Simulator */}
                <label className={`flex items-start gap-3.5 p-3.5 rounded-lg border cursor-pointer transition ${
                  formData.paymentMethod === 'online_gateway'
                    ? 'border-stone-900 bg-stone-50/80 shadow-xs ring-1 ring-stone-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online_gateway"
                    checked={formData.paymentMethod === 'online_gateway'}
                    onChange={() => setFormData({ ...formData, paymentMethod: 'online_gateway' })}
                    className="mt-0.5 text-stone-900"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-stone-700" />
                      <span className="text-xs font-bold text-stone-900">Online Payment Gateway (Safepay / JazzCash)</span>
                      <span className="text-[10px] text-stone-600 bg-stone-200 font-medium px-2 py-0.5 rounded">
                        HMAC Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Secure cryptographic handshake with 3D Secure card verification.
                    </p>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary & Voucher */}
          <div className="lg:col-span-5 bg-stone-50 p-6 border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-stone-900 border-b border-stone-200 pb-2">
                Order Review ({items.length} items)
              </h3>

              {/* Items scroll */}
              <div className="max-h-44 overflow-y-auto divide-y divide-stone-200/80 pr-1">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variantId || 'base'}`} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <img src={item.image} alt="" className="w-8 h-8 object-cover rounded border border-stone-200 shrink-0" />
                      <div>
                        <p className="font-semibold text-stone-900 line-clamp-1">{item.name}</p>
                        <p className="text-[11px] text-stone-500">
                          Qty: {item.quantity} {item.variantName ? `· ${item.variantName}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-medium text-stone-900 tabular-nums">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo code redemption */}
              <div className="pt-2 border-t border-stone-200">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Voucher / Privilege Code
                </label>

                {appliedPromo ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs text-emerald-900">
                    <div>
                      <span className="font-bold font-mono tracking-wider">{appliedPromo.code}</span>
                      <span className="block text-[11px] text-emerald-700">-{formatCurrency(appliedPromo.discountAmount)} saved</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-emerald-800 hover:text-emerald-950 font-semibold text-[11px] underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="e.g. WELCOME10"
                        className="flex-1 uppercase font-mono bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                      <button
                        type="button"
                        disabled={isCheckingPromo}
                        onClick={() => handleApplyPromo()}
                        className="px-3.5 py-1.5 bg-stone-900 text-stone-100 rounded text-xs font-semibold hover:bg-stone-800"
                      >
                        {isCheckingPromo ? 'Checking...' : 'Apply'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500 pt-0.5">
                      <span>Available:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo('WELCOME10')}
                        className="underline text-stone-700 font-mono hover:text-stone-950"
                      >
                        WELCOME10
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo('KKBEAUTY')}
                        className="underline text-stone-700 font-mono hover:text-stone-950"
                      >
                        KKBEAUTY
                      </button>
                    </div>

                    {promoError && (
                      <p className="text-[11px] text-red-600 mt-1">{promoError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Courier Logistics & Financial Summary */}
              <div className="border-t border-stone-200 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Voucher Deduction</span>
                    <span className="font-mono tabular-nums">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>{shippingRate.carrier} ({shippingRate.estimatedDeliveryDays})</span>
                  <span className="font-mono tabular-nums">
                    {deliveryFee === 0 ? <span className="text-emerald-700 font-semibold">Free</span> : formatCurrency(deliveryFee)}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t border-stone-300 pt-3 flex justify-between items-baseline font-serif">
                <span className="text-sm font-bold text-stone-900">Total Payable</span>
                <span className="text-xl font-bold font-mono text-stone-950 tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-stone-900 text-stone-100 hover:bg-stone-800 active:scale-[0.99] font-medium text-xs tracking-wider uppercase transition shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-300" />
                    <span>Reserving Stock &amp; Submitting...</span>
                  </>
                ) : formData.paymentMethod === 'online_gateway' ? (
                  <>
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Proceed to Gateway · {formatCurrency(grandTotal)}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Confirm COD Order · {formatCurrency(grandTotal)}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-stone-500 pt-2 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Protected with transactional server inventory lock.</span>
              </div>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
};
