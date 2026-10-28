import React from 'react';
import { CheckCircle2, Package, Truck, Printer, ArrowRight, ShieldCheck } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency, formatDate } from '../utils/currency';

interface OrderConfirmationModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  onClose
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Header */}
        <div className="bg-emerald-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-800/80 text-emerald-200 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] uppercase font-semibold tracking-widest text-emerald-200">
              Order Confirmed &amp; In Queue
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Thank You, {order.customerName}
            </h2>
            <p className="text-xs text-emerald-100 max-w-md mx-auto">
              Your order <strong className="font-mono text-white underline tracking-wider">{order.orderNumber}</strong> has been received and scheduled for express dispatch.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Fulfillment Tracking Status */}
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-900">Delivery Status</span>
              <span className="font-mono text-stone-500">
                Tracking: <strong className="text-stone-900">{order.trackingNumber || 'Pending Assignment'}</strong>
              </span>
            </div>

            {/* Stepper Timeline */}
            <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px]">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold mb-1">
                  ✓
                </div>
                <span className="font-semibold text-stone-900">Placed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold mb-1">
                  ✓
                </div>
                <span className="font-semibold text-stone-900">Processing</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold mb-1">
                  3
                </div>
                <span className="text-stone-500">Shipped</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold mb-1">
                  4
                </div>
                <span className="text-stone-500">Delivered</span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center pt-1">
              Estimated delivery: <strong>2–3 business days</strong> to {order.shippingAddress.city}, Pakistan.
            </p>
          </div>

          {/* Itemized Order Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-stone-900 border-b border-stone-200 pb-2">
              Itemized Receipt
            </h3>

            <div className="divide-y divide-stone-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-stone-900">{item.name}</p>
                    <p className="text-[11px] text-stone-500">
                      Qty: {item.quantity} {item.variantName ? `· ${item.variantName}` : ''} · SKU: {item.sku}
                    </p>
                  </div>
                  <span className="font-mono font-medium text-stone-900 tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-stone-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-800 font-medium">
                  <span>Voucher Discount {order.appliedPromoCode ? `(${order.appliedPromoCode})` : ''}</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Nationwide Shipping</span>
                <span className="font-mono tabular-nums">
                  {order.shippingAmount === 0 ? <span className="text-emerald-700 font-semibold">Free</span> : formatCurrency(order.shippingAmount)}
                </span>
              </div>
              <div className="border-t border-stone-200 pt-2 flex justify-between font-serif font-bold text-sm text-stone-950">
                <span>Total Paid / Due</span>
                <span className="font-mono tabular-nums text-base">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Shipping & Payment snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-stone-600 border-t border-stone-200">
            <div>
              <span className="font-semibold text-stone-900 block mb-1">Destination Address</span>
              <p>{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.stateOrProvince} {order.shippingAddress.postalCode}</p>
              <p className="font-mono text-[11px] mt-0.5">{order.shippingAddress.phone}</p>
            </div>
            <div>
              <span className="font-semibold text-stone-900 block mb-1">Payment Method</span>
              <p className="capitalize font-medium text-stone-800">
                {order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery (COD)' : 'Instant Card Online'}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Status: <strong className="uppercase font-mono">{order.paymentStatus}</strong>
              </p>
              <p className="text-[11px] text-stone-500">
                Placed on: {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-stone-300 rounded-full text-xs font-semibold text-stone-800 hover:bg-stone-50 transition"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span>Print Invoice Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-semibold transition"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
